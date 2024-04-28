import {Controller, Get} from '@nestjs/common';

@Controller()
export class MockController {
    @Get()
    mockResponse() {
        return "Hello bai acesta";
    }
}