import { Matches } from 'class-validator';

export class UnlockDto {
  @Matches(/^\d{4}$/, { message: 'Le code PIN doit contenir exactement 4 chiffres' })
  pin: string;
}
