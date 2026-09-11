import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Request } from 'express';
import { PublicAuthGuard } from '../auth/guards/public-auth.guard';
import { CurrentPublicSession } from '../auth/decorators/current-public-session.decorator';
import { PublicJwtPayload } from '../auth/jwt-payload.type';
import { PublicService } from './public.service';
import { UnlockDto } from './dto/unlock.dto';
import { AuditContext } from '../audit/audit.service';

const MAX_FILE_SIZE_BYTES = Number(process.env.MAX_FILE_SIZE_MB ?? 20) * 1024 * 1024;

function auditContext(req: Request): AuditContext {
  return { ip: req.ip, userAgent: req.headers['user-agent'] ?? null };
}

@Controller('public/:token')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Post('unlock')
  unlock(@Param('token') token: string, @Body() dto: UnlockDto, @Req() req: Request) {
    return this.publicService.unlock(token, dto.pin, auditContext(req));
  }

  @Get('status')
  @UseGuards(PublicAuthGuard)
  getStatus(@CurrentPublicSession() session: PublicJwtPayload) {
    return this.publicService.getStatus(session.sub);
  }

  @Post('files')
  @UseGuards(PublicAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // never touches the app's local disk
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
    }),
  )
  uploadFile(
    @CurrentPublicSession() session: PublicJwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier recu');
    }
    return this.publicService.uploadFile(session.sub, file, auditContext(req));
  }
}
