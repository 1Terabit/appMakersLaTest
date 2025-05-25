/**
 * Driver domain entity
 * Represents a driver in the transportation system with all their profile information
 */
export class Driver {
  /**
   * Unique identifier for the driver
   */
  id: string;

  /**
   * Driver's full name
   */
  name: string;

  /**
   * Driver's email address, used for authentication
   */
  email: string;

  /**
   * Driver's password, stored in hashed format
   */
  password: string;

  /**
   * URL to the driver's profile image
   */
  profileImage: string;

  /**
   * Date when the driver account was created
   */
  createdAt: Date;

  /**
   * Date when the driver account was last updated
   */
  updatedAt: Date;

  /**
   * Creates a new Driver instance
   * @param partial Partial Driver object with properties to be assigned
   */
  constructor(partial: Partial<Driver>) {
    Object.assign(this, partial);
  }
}
