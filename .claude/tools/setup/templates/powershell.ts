/**
 * PowerShell profile snippet template (Windows)
 */

export const powershellTemplate = `
# PAI (Personal AI Infrastructure) Configuration
# Added by pai-setup on {{{createdAt}}}
$env:PAI_DIR = "{{{paiDir}}}"
$env:DA = "{{{assistantName}}}"
$env:DA_COLOR = "{{{assistantColor}}}"
$env:ENGINEER_NAME = "{{{userName}}}"
# End PAI Configuration
`;

export const PS_MARKER_START = '# PAI (Personal AI Infrastructure) Configuration';
export const PS_MARKER_END = '# End PAI Configuration';
