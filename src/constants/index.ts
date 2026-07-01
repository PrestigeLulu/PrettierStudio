export const PRETTIER_CONFIG_PATTERN =
  /(?:^|[\\/])(?:\.prettierrc(?:\.(?:json|ya?ml|js|cjs|mjs))?|prettier\.config\.(?:js|cjs|mjs|ts))$/i

export const EXAMPLE_CODE = `
/** @format */

const editorSettings = {
  projectName: "Prettier Studio",
  maintainers: ["Lulu", "Open Source Contributors"],
  rules: { semi: false, singleQuote: true, printWidth: 80 },
};

const formatUser = (user) => ({
  id: user.id,
  displayName: user.name ?? "Anonymous",
  roles: user.roles.map((role) => role.toUpperCase()),
});

const users = [
  { id: 1, name: "Ada Lovelace", roles: ["admin", "reviewer"] },
  { id: 2, name: "Grace Hopper", roles: ["developer"] },
];

const summary = users
  .map(formatUser)
  .filter((user) => user.roles.includes("ADMIN") || user.roles.includes("DEVELOPER"));

function SettingsPreview() {
  return (
    <section className="preview" data-project={editorSettings.projectName}>
      <h1>{editorSettings.projectName}</h1>
      <p>{summary.length + " collaborators are ready for this workspace."}</p>
    </section>
  );
}

console.log({ editorSettings, summary, SettingsPreview });
`
