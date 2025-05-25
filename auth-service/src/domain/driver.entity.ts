/**
 * Entity domain Driver
 *
 */
export class Driver {
  id: string;
  name: string;
  email: string;
  password: string; // Almacenada en formato hash
  profileImage: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<Driver>) {
    Object.assign(this, partial);
  }
}
