import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { LawyerAuthGuard } from '../auth/guards/lawyer-auth.guard';
import { CurrentLawyer } from '../auth/decorators/current-lawyer.decorator';
import { LawyerJwtPayload } from '../auth/jwt-payload.type';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';

@Controller('requests')
@UseGuards(LawyerAuthGuard)
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Post()
  create(@CurrentLawyer() lawyer: LawyerJwtPayload, @Body() dto: CreateRequestDto) {
    return this.requests.create(lawyer.sub, dto);
  }

  @Get()
  list(@CurrentLawyer() lawyer: LawyerJwtPayload) {
    return this.requests.list(lawyer.sub);
  }

  @Get(':id')
  findOne(@CurrentLawyer() lawyer: LawyerJwtPayload, @Param('id') id: string) {
    return this.requests.findOneForLawyer(lawyer.sub, id);
  }
}
