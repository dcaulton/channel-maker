export type PlaylistSlot = {
  title: string;
  startsAt: Date;
  endsAt: Date;
  mediaAsset: {
    title: string;
    sourceUrl: string;
    needsVpn: boolean;
    vpnCountry: string | null;
  } | null;
};

export type BuildPlaylistOptions = {
  channelName: string;
  vpnProxyBaseUrl?: string;
};

/**
 * Build a simple M3U playlist from schedule slots.
 * VPN-marked assets are rewritten through vpnProxyBaseUrl when configured.
 */
export function buildM3u(
  slots: PlaylistSlot[],
  options: BuildPlaylistOptions,
): string {
  const lines: string[] = ['#EXTM3U'];

  for (const slot of slots) {
    const displayTitle = slot.mediaAsset?.title ?? slot.title;
    const durationSec = Math.max(
      0,
      Math.round((slot.endsAt.getTime() - slot.startsAt.getTime()) / 1000),
    );

    lines.push(`#EXTINF:${durationSec},${displayTitle}`);

    const url = resolvePlayUrl(slot, options.vpnProxyBaseUrl);
    if (url) {
      lines.push(url);
    } else {
      lines.push(`# NO_SOURCE title="${displayTitle}"`);
    }
  }

  return lines.join('\n') + '\n';
}

function resolvePlayUrl(
  slot: PlaylistSlot,
  vpnProxyBaseUrl?: string,
): string | null {
  const asset = slot.mediaAsset;
  if (!asset?.sourceUrl) {
    return null;
  }

  if (asset.needsVpn) {
    if (!vpnProxyBaseUrl) {
      return null;
    }
    const base = vpnProxyBaseUrl.replace(/\/$/, '');
    const country = encodeURIComponent(asset.vpnCountry ?? 'XX');
    const target = encodeURIComponent(asset.sourceUrl);
    return `${base}/play?country=${country}&target=${target}`;
  }

  return asset.sourceUrl;
}
