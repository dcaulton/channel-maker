import { Logger } from '@nestjs/common';
import { BasicSlateRenderer } from '../basic-slate-renderer';
import type { SlateSpec } from '../slate.types';

/** Named renderer. Inherits the basic mux until the tape chain is worth turning on. */
export class VhsSlateRenderer extends BasicSlateRenderer {
  override readonly name = 'vhs';
  private readonly logger = new Logger(VhsSlateRenderer.name);

  override async render(spec: SlateSpec, filePath: string): Promise<void> {
    this.logger.debug('vhs renderer selected; using inherited basic render');
    await super.render(spec, filePath);
  }
}
