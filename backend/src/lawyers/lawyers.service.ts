import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lawyer } from './lawyer.entity';

@Injectable()
export class LawyersService {
  constructor(@InjectRepository(Lawyer) private readonly repo: Repository<Lawyer>) {}

  findByEmail(email: string): Promise<Lawyer | null> {
    return this.repo.findOne({ where: { email } });
  }

  findById(id: string): Promise<Lawyer | null> {
    return this.repo.findOne({ where: { id } });
  }
}
