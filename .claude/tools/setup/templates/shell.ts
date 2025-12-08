/**
 * Shell profile snippet template
 */

export const shellTemplate = `
# PAI (Personal AI Infrastructure) Configuration
# Added by pai-setup on {{{createdAt}}}
export PAI_DIR="{{{paiDir}}}"
export DA="{{{assistantName}}}"
export DA_COLOR="{{{assistantColor}}}"
export ENGINEER_NAME="{{{userName}}}"
# End PAI Configuration
`;

export const SHELL_MARKER_START = '# PAI (Personal AI Infrastructure) Configuration';
export const SHELL_MARKER_END = '# End PAI Configuration';
