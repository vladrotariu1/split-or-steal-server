import {
    BadRequestException,
    HttpException,
    HttpStatus,
    InternalServerErrorException,
    PipeTransform,
} from '@nestjs/common';
import { Express } from 'express';
import { FileDto } from '../dto/file.dto';

export class FileExtensionValidationPipe implements PipeTransform {
    private readonly supportedFileTypes = [
        'image/png',
        'image/jpg',
        'image/jpeg',
    ];

    transform(value: Express.Multer.File) {
        if (!value) {
            throw new BadRequestException('No file uploaded');
        }

        const fileType = value.mimetype;

        if (!this.isFileTypeSupported(fileType)) {
            throw new HttpException(
                `Unsupported file type. Supported media types are: ${this.supportedFileTypesToString()}`,
                HttpStatus.UNSUPPORTED_MEDIA_TYPE,
            );
        }

        const fileExtension = fileType.split('/')[1];

        if (!fileExtension) {
            console.log('Error parsing the extension');
            throw new InternalServerErrorException('Server error');
        }

        return { ...value, extension: fileExtension } as FileDto;
    }

    private isFileTypeSupported(fileType) {
        return !!this.supportedFileTypes.find((type) => fileType === type);
    }

    private supportedFileTypesToString() {
        return this.supportedFileTypes.reduce(
            (type, accumulator) => accumulator + ' ' + type,
            '',
        );
    }
}
