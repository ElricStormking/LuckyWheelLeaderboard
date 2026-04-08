import {
  Delete,
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type {
  AdminPrizeImageUploadResponse,
  AdminUploadedImageDeleteRequest,
  AdminUploadedImageDeleteResponse,
} from "@lucky-wheel/contracts";
import { AdminUploadService } from "./admin-upload.service";

type UploadedImageFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Controller("v2/admin/uploads")
export class AdminUploadController {
  constructor(private readonly adminUploadService: AdminUploadService) {}

  @Post("events/:eventId/prizes/:prizeId/image")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadPrizeImage(
    @Param("eventId") eventId: string,
    @Param("prizeId") prizeId: string,
    @UploadedFile() file?: UploadedImageFile,
  ): Promise<AdminPrizeImageUploadResponse> {
    return this.adminUploadService.uploadPrizeImage(eventId, prizeId, file);
  }

  @Post("events/:eventId/prize-image")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadUnassignedPrizeImage(
    @Param("eventId") eventId: string,
    @Body("prizeId") prizeId: string | undefined,
    @Body("oldImageUrl") oldImageUrl: string | undefined,
    @UploadedFile() file?: UploadedImageFile,
  ): Promise<AdminPrizeImageUploadResponse> {
    if (!prizeId) {
      throw new BadRequestException("prizeId is required.");
    }

    return this.adminUploadService.uploadPrizeImage(eventId, prizeId, file, oldImageUrl);
  }

  @Delete()
  deleteUploadedImage(
    @Body() request: AdminUploadedImageDeleteRequest,
  ): Promise<AdminUploadedImageDeleteResponse> {
    return this.adminUploadService.deleteUploadedImage(request.imageUrl);
  }
}

