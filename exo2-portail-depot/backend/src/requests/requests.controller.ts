import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { LawyerAuthGuard } from '../auth/guards/lawyer-auth.guard';
import { CurrentLawyer } from '../auth/decorators/current-lawyer.decorator';
import { LawyerJwtPayload } from '../auth/jwt-payload.type';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { ListRequestsDto } from './dto/list-requests.dto';

@Controller('requests')
@UseGuards(LawyerAuthGuard)
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Post()
  create(@CurrentLawyer() lawyer: LawyerJwtPayload, @Body() dto: CreateRequestDto) {
    return this.requests.create(lawyer.sub, dto);
  }

  @Get()
  list(@CurrentLawyer() lawyer: LawyerJwtPayload, @Query() query: ListRequestsDto) {
    return this.requests.list(lawyer.sub, query);
  }

  // Without ParseUUIDPipe a non-uuid :id reaches postgres and comes back as
  // an invalid-input-syntax driver error, i.e. a 500 on what is really a
  // malformed request. The pipe answers 400 before touching the database.
  @Get(':id')
  findOne(@CurrentLawyer() lawyer: LawyerJwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.requests.findOneForLawyer(lawyer.sub, id);
  }
}
