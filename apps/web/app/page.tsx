import { DesignerShell } from './designer-shell';
import { loadChannels } from './load-channels';

export default async function DesignerPage() {
  const { channels, error } = await loadChannels();
  return <DesignerShell channels={channels} error={error} />;
}
