// Labels are message keys; the settings layout translates them per locale.
export const SETTINGS_NAV = [
  { group: "dash.shell.groupPersonal", items: [["profile", "dash.shell.profile"], ["billing", "dash.shell.billing"], ["notifications", "dash.shell.notifications"]] },
  { group: "dash.shell.groupWorkspace", items: [["general", "dash.shell.general"], ["branding", "dash.shell.branding"], ["access", "dash.shell.access"], ["team", "dash.shell.team"]] },
  { group: "dash.shell.groupProduct", items: [["public-board", "dash.shell.publicBoardSettings"], ["boards", "dash.shell.boardsSettings"], ["statuses", "dash.shell.statuses"]] },
  { group: "dash.shell.groupDevelopers", items: [["api-keys", "dash.shell.apiKeys"], ["export", "dash.shell.export"]] },
] as const;
