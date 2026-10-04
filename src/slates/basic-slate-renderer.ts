import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { encodeSpec, specDescription } from './slate-spec';
import type { SlateSpec } from './slate.types';

const execFileAsync = promisify(execFile);

function escapeDrawtext(text: string): string {
  return text.replace(/[:\\'[\]]/g, ' ').slice(0, 72);
}

/**
 * Basic card. Custom renderers extend this and override render or videoFilter.
 * The spec is finished before ffmpeg is called.
 */
export class BasicSlateRenderer {
  readonly name: string = 'basic';

  async render(spec: SlateSpec, filePath: string): Promise<void> {
    const args = ['-y', ...this.videoInput(spec)];
    if (spec.bedPath) {
      args.push(
        '-stream_loop',
        '-1',
        '-i',
        spec.bedPath,
        '-filter_complex',
        this.filterComplex(spec),
        '-map',
        '[v]',
        '-map',
        '[a]',
        '-c:a',
        'aac',
        '-ac',
        '2',
        '-ar',
        '48000',
      );
    } else {
      args.push('-an', '-vf', this.videoFilter(spec));
    }
    args.push(
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-t',
      String(spec.durationSec),
      '-metadata',
      `title=${spec.kind}`,
      '-metadata',
      `description=${specDescription(spec)}`,
      '-metadata',
      `slate_spec=${encodeSpec(spec)}`,
      '-movflags',
      '+use_metadata_tags',
      filePath,
    );
    await execFileAsync('ffmpeg', args);
  }

  protected videoInput(spec: SlateSpec): string[] {
    if (spec.imagePath) {
      return ['-loop', '1', '-framerate', '30', '-i', spec.imagePath];
    }
    return [
      '-f',
      'lavfi',
      '-i',
      `color=c=0x101010:s=1920x1080:d=${spec.durationSec}`,
    ];
  }

  protected videoFilter(spec: SlateSpec): string {
    const scale = spec.imagePath
      ? 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,'
      : '';
    const text = spec.lines.map((line) => {
      return `drawtext=text='${escapeDrawtext(line.text)}':fontcolor=${line.color}:fontsize=42:x=(w-text_w)/2:y=${line.y}`;
    });
    return `${scale}format=yuv420p,${text.join(',')}`;
  }

  protected filterComplex(spec: SlateSpec): string {
    return `[0:v]${this.videoFilter(spec)}[v];[1:a]atrim=0:${spec.durationSec},asetpts=PTS-STARTPTS[a]`;
  }
}
