/**
 * Capture recent Telegram messages for fixture creation
 */
import { getConfig } from "../lib/config";
import { getUpdates } from "../lib/telegram";

const config = getConfig();

const updates = await getUpdates(config.telegramBotToken, undefined, 10, 0);

for (const u of updates) {
  const msg = (u as any).message || (u as any).channel_post;
  if (!msg) continue;

  const type = msg.voice ? 'voice' : msg.audio ? 'audio' : msg.photo ? 'photo' : msg.document ? 'document' : 'text';
  const caption = msg.caption || '';
  const text = msg.text || '';

  console.log('---');
  console.log('msg_id:', msg.message_id);
  console.log('chat:', msg.chat?.title);
  console.log('type:', type);
  console.log('caption/text:', (text || caption).substring(0, 100));
  if (msg.document) console.log('filename:', msg.document.file_name, 'size:', msg.document.file_size);
  if (msg.photo) console.log('photo sizes:', msg.photo.length, 'largest:', msg.photo[msg.photo.length-1]?.file_size);
  console.log('JSON:', JSON.stringify(msg));
  console.log('---');
}
