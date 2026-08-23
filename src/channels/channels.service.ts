import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Injectable()
export class ChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateChannelDto) {
    try {
      return await this.prisma.channel.create({ data: dto });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException(`Channel with slug "${dto.slug}" already exists`);
      }
      throw error;
    }
  }

  findAll() {
    return this.prisma.channel.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id },
      include: { slots: { orderBy: { startsAt: 'asc' } } },
    });
    if (!channel) {
      throw new NotFoundException(`Channel ${id} not found`);
    }
    return channel;
  }

  async update(id: string, dto: UpdateChannelDto) {
    await this.findOne(id);
    try {
      return await this.prisma.channel.update({
        where: { id },
        data: dto,
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException(`Slug already in use`);
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.channel.delete({ where: { id } });
  }
}
