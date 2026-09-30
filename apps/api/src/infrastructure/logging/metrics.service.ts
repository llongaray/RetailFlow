import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private readonly counts = new Map<string, number>();

  hit(method: string, route: string, status: number) {
    const key = `${method} ${route} ${status}`;
    this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
  }

  prometheus() {
    const lines = ['# TYPE retailflow_http_requests_total counter'];
    for (const [key, count] of this.counts) {
      const [method, route, status] = key.split(' ');
      lines.push(`retailflow_http_requests_total{method="${method}",route="${route}",status="${status}"} ${count}`);
    }
    return `${lines.join('\n')}\n`;
  }
}
