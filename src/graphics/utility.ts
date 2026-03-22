export function degrees_to_radians(degrees:number):number {
  return degrees * (Math.PI / 180);
};

export function get_uniform_label_index(raw_label:string):number {
  const match = raw_label.match(/\[(\d+)\][^\[]*$/);
  return match ? parseInt(match[1], 10) : 0;
}

export function normalize_uniform_label(raw_label:string) {
  var return_label = "";
  var start_ignore = false;
  var is_array = false;
  for (const char of raw_label) {
    switch (char) {
      case '[':
        start_ignore = true;
        is_array = true;
        break;

      case ']':
        start_ignore = false;
        is_array = true;
        break;
    
      default:
        if (!start_ignore)
          return_label += char;
        break;
    }
  }

  if (is_array)
    return_label = "[]" + return_label;
  
  return return_label;
}

export function parse_path(p: string) {
    const parts = p.split("/");
    const base = parts.pop() || "";
    const dir = parts.join("/") || "";
    const extIndex = base.lastIndexOf(".");

    const ext = extIndex !== -1 ? base.slice(extIndex) : "";
    const name = extIndex !== -1 ? base.slice(0, extIndex) : base;

    return {
        root: p.startsWith("/") ? "/" : "",
        dir,
        base,
        ext,
        name
    };
}

export function join_path(...parts: string[]): string {
    return parts
        .filter(part => part && typeof part === "string")
        .join("/")
        .replace(/\/+/g, "/")           // collapse multiple slashes
        .replace(/\/\.\//g, "/")        // remove "/./"
        .replace(/(^|\/)(?!\.\.)[^\/]+\/\.\.\//g, "$1"); // resolve "../"
}

export function basename_path(path: string, ext?: string): string {
    if (!path) return "";

    // remove trailing slashes
    path = path.replace(/\/+$/, "");

    const idx = path.lastIndexOf("/");
    let base = idx === -1 ? path : path.slice(idx + 1);

    if (ext && base.endsWith(ext)) {
        base = base.slice(0, -ext.length);
    }

    return base;
}

export function dirname_path(path: string): string {
    if (!path) return ".";

    const hasRoot = path.startsWith("/");

    // remove trailing slashes
    path = path.replace(/\/+$/, "");

    const idx = path.lastIndexOf("/");

    if (idx === -1) return ".";
    if (idx === 0) return "/";

    return path.slice(0, idx);
}