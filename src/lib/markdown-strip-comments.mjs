/**
 * Drop HTML comments from markdown before it renders.
 *
 * Lab entries carry their working notes as HTML comments at the top of the
 * body (who decided what, what is unverified, what not to claim). Markdown
 * passes raw HTML through, so those notes shipped in every built page's
 * source: on 11-22-26 /lab/bdl-009/ carried its whole note, internal process
 * words included. The repo is public, so this is tidiness more than secrecy,
 * but a page's source should not read as our notebook.
 *
 * Only an html node that is nothing but comments goes; any other raw HTML in
 * a markdown file is left alone. Scoped to the markdown pipeline on purpose:
 * comments elsewhere in the build are not ours to drop (Svelte islands use
 * comment markers to hydrate).
 *
 * A Sätteri mdast plugin (Astro 7's default markdown processor; remark plugins
 * would need the unified processor installed). Wired in astro.config.mjs.
 */
export const ONLY_COMMENTS = /^\s*(?:<!--[\s\S]*?-->\s*)+$/;

export const stripComments = {
  name: 'bdl-strip-comments',
  html(node, context) {
    if (ONLY_COMMENTS.test(node.value)) context.removeNode(node);
  },
};
