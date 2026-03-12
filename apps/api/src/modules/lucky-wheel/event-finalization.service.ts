import { randomUUID } from "node:crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { EventStatus } from "@lucky-wheel/contracts";
import { PrismaService } from "../../prisma/prisma.service";

type FinalizableEventRecord = Prisma.EventCampaignGetPayload<{
  include: {
    prizes: true;
  };
}>;

@Injectable()
export class EventFinalizationService {
  constructor(private readonly prisma: PrismaService) {}

  async finalizeEvent(
    eventId: string,
    options: {
      trigger: "manual" | "auto";
      graceMinutes?: number;
    },
  ): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const event = await transaction.eventCampaign.findUnique({
        where: { id: eventId },
        include: {
          prizes: true,
        },
      });

      if (!event) {
        throw new NotFoundException(`Event ${eventId} was not found.`);
      }

      if (
        event.status === EventStatus.Cancelled ||
        event.status === EventStatus.Finalized
      ) {
        return false;
      }

      const rankedScores = await transaction.playerEventScore.findMany({
        where: { eventCampaignId: eventId },
        include: { player: true },
        orderBy: [{ totalScore: "desc" }, { updatedAt: "asc" }],
      });

      for (const [index, score] of rankedScores.entries()) {
        const rank = index + 1;
        await transaction.playerEventSummary.upsert({
          where: {
            eventCampaignId_playerId: {
              eventCampaignId: eventId,
              playerId: score.playerId,
            },
          },
          update: {
            finalScore: score.totalScore,
            finalRank: rank,
            prizeName: this.resolvePrizeName(rank, event.prizes),
            endedAt: event.endAt,
          },
          create: {
            id: `summary-${randomUUID()}`,
            eventCampaignId: eventId,
            playerId: score.playerId,
            finalScore: score.totalScore,
            finalRank: rank,
            prizeName: this.resolvePrizeName(rank, event.prizes),
            endedAt: event.endAt,
          },
        });
      }

      await transaction.eventCampaign.update({
        where: { id: eventId },
        data: { status: EventStatus.Finalized },
      });

      await transaction.adminAuditLog.create({
        data: {
          id: `audit-${randomUUID()}`,
          eventCampaignId: eventId,
          action:
            options.trigger === "auto" ? "auto_finalize" : "finalize",
          entityType: "event_campaign",
          entityId: eventId,
          summary: this.buildSummary(event, options),
          payloadJson:
            options.trigger === "auto"
              ? JSON.stringify({
                  trigger: options.trigger,
                  graceMinutes: options.graceMinutes ?? null,
                })
              : null,
        },
      });

      return true;
    });
  }

  private resolvePrizeName(
    rank: number,
    prizes: FinalizableEventRecord["prizes"],
  ) {
    const prize = prizes.find(
      (entry) => rank >= entry.rankFrom && rank <= entry.rankTo,
    );
    return prize?.prizeLabel ?? null;
  }

  private buildSummary(
    event: Pick<FinalizableEventRecord, "code">,
    options: {
      trigger: "manual" | "auto";
      graceMinutes?: number;
    },
  ) {
    if (options.trigger === "auto") {
      return `Auto-finalized event ${event.code} after ${options.graceMinutes ?? 0} minute(s) of settlement grace.`;
    }

    return `Finalized event ${event.code} and snapshot player standings.`;
  }
}
