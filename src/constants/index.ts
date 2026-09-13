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

export const PREVIEW_EXAMPLES: Record<
  string,
  { parser: string; code: string }
> = {
  javascript: { parser: 'babel', code: EXAMPLE_CODE },
  typescript: {
    parser: 'typescript',
    code: '/** @format */\ninterface User { id:number; name:string; roles:string[] }\nconst greet = (user:User):string => { return "Hello, " + user.name; };\n',
  },
  html: {
    parser: 'html',
    code: '<!-- @format -->\n<section class="preview" id="example" data-project="Prettier Studio"><h1>Hello <span>world</span>!</h1><p>Try whitespace and attribute options.</p></section>\n',
  },
  vue: {
    parser: 'vue',
    code: '<!-- @format -->\n<template><section class="preview" id="example"><h1>{{ title }}</h1></section></template>\n<script>export default {data(){return {title:"Prettier Studio"}}}</script>\n<style>.preview { color: #336699; padding: 10px 20px; }</style>\n',
  },
  markdown: {
    parser: 'markdown',
    code: '<!-- @format -->\n# Prettier Studio\n\nThis example contains a long paragraph so you can compare how proseWrap and printWidth change wrapping in Markdown documents while keeping the same text.\n\n- first item\n- second item\n\n```js\nconst settings={semi:false,singleQuote:true};\n```\n',
  },
  css: {
    parser: 'css',
    code: '/* @format */\n.preview{color:#336699;padding:10px 20px;font-family:"Open Sans",sans-serif;}\n@media(min-width:600px){.preview{display:flex;gap:16px;}}\n',
  },
  json: {
    parser: 'json',
    code: '{"name":"Prettier Studio","settings":{"semi":false,"tabWidth":2},"languages":["JavaScript","HTML","Vue","Markdown"]}',
  },
}
