import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { imageSize } from "image-size";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  AdminPrizeImageUploadResponse,
  AdminUploadedImageDeleteResponse,
} from "@lucky-wheel/contracts";
import { PrismaService } from "../../prisma/prisma.service";
import { resolveUploadPublicBaseUrl, resolveUploadRoot } from "./upload-storage";

const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};
const PRIZE_IMAGE_MIN_WIDTH = 300;
const PRIZE_IMAGE_MIN_HEIGHT = 180;
const PRIZE_IMAGE_MIN_ASPECT_RATIO = 1.2;
const PRIZE_IMAGE_MAX_ASPECT_RATIO = 2.2;

type UploadableFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class AdminUploadService {
  constructor(private readonly prisma: PrismaService) {}

  async uploadPrizeImage(
    eventId: string,
    prizeId: string | undefined,
    file: UploadableFile | undefined,
    previousImageUrl?: string,
  ): Promise<AdminPrizeImageUploadResponse> {
    if (!eventId) {
      throw new BadRequestException("eventId is required.");
    }

    if (!file) {
      throw new BadRequestException("Image file is required.");
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException("Only PNG, JPEG, and WEBP images are allowed.");
    }

    const maxSizeBytes =
      (Number(process.env.MAX_UPLOAD_FILE_SIZE_MB || "5") || 5) * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new BadRequestException(
        `Image exceeds the maximum allowed size of ${Math.floor(maxSizeBytes / 1024 / 1024)}MB.`,
      );
    }

    const dimensions = imageSize(file.buffer);
    const width = dimensions.width;
    const height = dimensions.height;
    if (!width || !height) {
      throw new BadRequestException("Unable to read image dimensions.");
    }

    if (width < PRIZE_IMAGE_MIN_WIDTH || height < PRIZE_IMAGE_MIN_HEIGHT) {
      throw new BadRequestException(
        `Prize images must be at least ${PRIZE_IMAGE_MIN_WIDTH}x${PRIZE_IMAGE_MIN_HEIGHT}px.`,
      );
    }

    const aspectRatio = width / height;
    if (
      aspectRatio < PRIZE_IMAGE_MIN_ASPECT_RATIO ||
      aspectRatio > PRIZE_IMAGE_MAX_ASPECT_RATIO
    ) {
      throw new BadRequestException(
        "Prize images must be landscape oriented. Use an aspect ratio close to 3:2 or 16:10.",
      );
    }

    const event = await this.prisma.eventCampaign.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException(`Unknown event: ${eventId}`);
    }

    const safePrizeId = this.sanitizePathSegment(prizeId || "unassigned");
    const safeBaseName = this.sanitizeBaseName(file.originalname);
    const extension =
      MIME_EXTENSION_MAP[file.mimetype] ??
      path.extname(file.originalname) ??
      ".bin";
    const fileName = `${Date.now()}-${randomUUID()}-${safeBaseName}${extension}`;
    const relativeSegments = ["admin", "events", this.sanitizePathSegment(eventId), "prizes", safePrizeId];
    const relativeDirectory = path.join(...relativeSegments);
    const targetDirectory = path.join(resolveUploadRoot(), relativeDirectory);
    const targetFile = path.join(targetDirectory, fileName);

    await mkdir(targetDirectory, { recursive: true });
    await writeFile(targetFile, file.buffer);
    await this.deleteManagedImage(previousImageUrl);

    const relativeUrlPath = [...relativeSegments, fileName]
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    return {
      storageKey: [...relativeSegments, fileName].join("/"),
      publicUrl: `${resolveUploadPublicBaseUrl()}/${relativeUrlPath}`,
      contentType: file.mimetype,
      sizeBytes: file.size,
      originalFileName: file.originalname,
      width,
      height,
    };
  }

  async deleteUploadedImage(imageUrl: string): Promise<AdminUploadedImageDeleteResponse> {
    return {
      deleted: await this.deleteManagedImage(imageUrl),
    };
  }

  private async deleteManagedImage(imageUrl: string | undefined) {
    const targetFile = this.resolveManagedFilePath(imageUrl);
    if (!targetFile) {
      return false;
    }

    try {
      await unlink(targetFile);
      return true;
    } catch (error) {
      const errorCode =
        typeof error === "object" && error && "code" in error ? (error as { code?: string }).code : undefined;
      if (errorCode === "ENOENT") {
        return false;
      }

      throw error;
    }
  }

  private resolveManagedFilePath(imageUrl: string | undefined) {
    if (!imageUrl) {
      return null;
    }

    let uploadBaseUrl: URL;
    let parsedImageUrl: URL;
    try {
      uploadBaseUrl = new URL(resolveUploadPublicBaseUrl());
      parsedImageUrl = new URL(imageUrl, uploadBaseUrl);
    } catch {
      return null;
    }

    const basePath = uploadBaseUrl.pathname.replace(/\/+$/, "");
    if (!parsedImageUrl.pathname.startsWith(basePath)) {
      return null;
    }

    const relativePath = parsedImageUrl.pathname.slice(basePath.length).replace(/^\/+/, "");
    if (!relativePath) {
      return null;
    }

    const decodedSegments = relativePath
      .split("/")
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment));
    const uploadRoot = path.resolve(resolveUploadRoot());
    const candidateFile = path.resolve(uploadRoot, ...decodedSegments);

    if (!candidateFile.startsWith(uploadRoot)) {
      return null;
    }

    return candidateFile;
  }

  private sanitizePathSegment(value: string) {
    return value.replace(/[^a-zA-Z0-9_-]/g, "-");
  }

  private sanitizeBaseName(fileName: string) {
    const baseName = path.basename(fileName, path.extname(fileName));
    const sanitized = baseName.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-");
    return sanitized || "upload";
  }
}

