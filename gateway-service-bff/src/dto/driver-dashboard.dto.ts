import { ApiProperty } from '@nestjs/swagger';

/**
 * Combined response for driver dashboard
 * Contains all information needed for the driver's main screen
 */
export class DriverDashboardDto {
  /**
   * Driver's basic profile information
   */
  @ApiProperty({
    description: 'Driver profile information',
    example: {
      id: '1',
      name: 'Juan Pérez',
      email: 'juan@example.com',
      profileImage: 'https://randomuser.me/api/portraits/men/1.jpg'
    }
  })
  profile: {
    id: string;
    name: string;
    email: string;
    profileImage?: string;
  };

  /**
   * Driver's current location information
   */
  @ApiProperty({
    description: 'Driver location information',
    example: {
      latitude: 19.4326,
      longitude: -99.1332,
      timestamp: '2025-05-23T02:00:00.000Z',
      isOnline: true
    }
  })
  location: {
    latitude: number;
    longitude: number;
    timestamp: Date;
    isOnline: boolean;
  } | null;

  /**
   * Real-time statistics for the driver
   */
  @ApiProperty({
    description: 'Driver statistics',
    example: {
      onlineDuration: 120, // minutes
      connectedClients: 5,
      lastUpdateTime: '2025-05-23T02:00:00.000Z'
    }
  })
  statistics: {
    onlineDuration: number; // minutes
    connectedClients: number;
    lastUpdateTime: Date;
  };
}
