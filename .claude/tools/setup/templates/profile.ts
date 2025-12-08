/**
 * User profile configuration template
 */

export const profileTemplate = `{
  "user": {
    "name": "{{{userName}}}",
    "email": "{{{userEmail}}}"
  },
  "assistant": {
    "name": "{{{assistantName}}}",
    "color": "{{{assistantColor}}}"
  },
  "paths": {
    "pai_dir": "{{{paiDir}}}"
  },
  "voice": {
    "port": {{voicePort}},
    "enabled": {{voiceEnabled}}
  },
  "created": "{{{createdAt}}}",
  "version": "1.0.0"
}`;
