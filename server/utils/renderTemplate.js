export const renderTemplate = (html, variables) => {
  Object.entries(variables).forEach(([key, value]) => {
    html = html.replaceAll(`{${key}}`, value ?? "");
  });
  return html;
};
