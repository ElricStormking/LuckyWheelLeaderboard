import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { EventStatus } from "@lucky-wheel/contracts";
import { PrismaService } from "../../prisma/prisma.service";
import { EventFinalizationService } from "./event-finalization.service";
import {
  resolveAutoFinalizeGraceMinutes,
} from "./event-lifecycle.config";

const LIFECYCLE_SYNC_INTERVAL_MS = 60 * 1000;

@Injectable()
export class EventLifecycleService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private readonly autoFinalizeGraceMinutes = resolveAutoFinalizeGraceMinutes(
    process.env.EVENT_AUTO_FINALIZE_GRACE_MINUTES,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventFinalizationService: EventFinalizationService,
  ) {}

  onModuleInit() {
    void this.syncStatuses();
    this.timer = setInterval(() => {
      void this.syncStatuses();
    }, LIFECYCLE_SYNC_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async syncStatuses() {
    const now = new Date();

    const [toLive, toEnded] = await Promise.all([
      this.prisma.eventCampaign.findMany({
        where: {
          status: EventStatus.Scheduled,
          startAt: {
            lte: now,
          },
          endAt: {
            gt: now,
          },
        },
        select: {
          id: true,
          code: true,
        },
      }),
      this.prisma.eventCampaign.findMany({
        where: {
          status: {
            in: [EventStatus.Scheduled, EventStatus.Live],
          },
          endAt: {
            lte: now,
          },
        },
        select: {
          id: true,
          code: true,
        },
      }),
    ]);

    if (toLive.length > 0 || toEnded.length > 0) {
      await this.prisma.$transaction(async (transaction) => {
        for (const event of toLive) {
          await transaction.eventCampaign.update({
            where: {
              id: event.id,
            },
            data: {
              status: EventStatus.Live,
            },
          });
          await transaction.adminAuditLog.create({
            data: {
              id: `audit-lifecycle-live-${event.id}-${Date.now()}`,
              eventCampaignId: event.id,
              action: "auto_transition",
              entityType: "event_campaign",
              entityId: event.id,
              summary: `Lifecycle sync promoted ${event.code} to live.`,
            },
          });
        }

        for (const event of toEnded) {
          await transaction.eventCampaign.update({
            where: {
              id: event.id,
            },
            data: {
              status: EventStatus.Ended,
            },
          });
          await transaction.adminAuditLog.create({
            data: {
              id: `audit-lifecycle-ended-${event.id}-${Date.now()}`,
              eventCampaignId: event.id,
              action: "auto_transition",
              entityType: "event_campaign",
              entityId: event.id,
              summary: `Lifecycle sync moved ${event.code} to ended.`,
            },
          });
        }
      });
    }

    const finalizeCutoff = new Date(
      now.getTime() - this.autoFinalizeGraceMinutes * 60 * 1000,
    );
    const toFinalize = await this.prisma.eventCampaign.findMany({
      where: {
        status: EventStatus.Ended,
        endAt: {
          lte: finalizeCutoff,
        },
      },
      select: {
        id: true,
      },
    });

    if (toLive.length === 0 && toEnded.length === 0 && toFinalize.length === 0) {
      return;
    }

    for (const event of toFinalize) {
      await this.eventFinalizationService.finalizeEvent(event.id, {
        trigger: "auto",
        graceMinutes: this.autoFinalizeGraceMinutes,
      });
    }
  }
}
