export function degrees_to_radians(degrees:number):number {
  return degrees * (Math.PI / 180);
};

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