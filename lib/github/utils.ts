export function parseRepoUrl(url: string): { owner: string; name: string } | null {
  try {
    if (!url) return null;


    const cleaned = url.replace(/\.git$/, "");


    const httpsMatch = cleaned.match(/github.com\/([^\/]+)\/([^\/]+)(?:\/.*)?$/);
    if (httpsMatch) return { owner: httpsMatch[1], name: httpsMatch[2] };


    const sshMatch = cleaned.match(/git@github.com:([^\/]+)\/([^\/]+)$/);
    if (sshMatch) return { owner: sshMatch[1], name: sshMatch[2] };

    return null;
  } catch {
    return null;
  }
}
