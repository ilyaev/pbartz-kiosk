import * as THREE from "three";

export class ShaderFile {
  text: string;
  vertex: string = "";
  fragment: string = "";
  vertexSections: { header: string; body: string } = { header: "", body: "" };
  fragmentSections: { header: string; body: string } = { header: "", body: "" };
  includes: { [key: string]: string };

  constructor(txt: string, includes: { [key: string]: string } = {}) {
    this.text = txt;
    this.includes = includes;
    this.parseIncludes();
    this.parse();
  }

  parseIncludes() {
    const includeRegex = /#include <([^>]+)>/g;
    this.text = this.text.replace(includeRegex, (match, p1) => {
      const include = this.includes[p1];
      if (include) {
        return include;
      } else {
        console.warn(`Include not found: ${p1}`);
        return match;
      }
    });
  }

  parse() {
    const vertexMatch = this.text.match(/#VERTEX([\s\S]*?)(?=#FRAGMENT|$)/);
    const fragmentMatch = this.text.match(/#FRAGMENT([\s\S]*)/);
    this.vertex = vertexMatch ? vertexMatch[1] : "";
    this.fragment = fragmentMatch ? fragmentMatch[1] : "";

    const headerBodyRegex = /##HEADER([\s\S]*?)##BODY([\s\S]*)/;

    const parseSections = (block: string) => {
      const match = block.match(headerBodyRegex);
      return match
        ? { header: match[1].trim(), body: match[2].trim() }
        : { header: "", body: block.trim() };
    };

    this.vertexSections = parseSections(this.vertex);
    this.fragmentSections = parseSections(this.fragment);
  }

  apply(shader: THREE.WebGLProgramParametersWithUniforms) {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `
        #include <common>
        ${this.vertexSections.header}

        `
    );

    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `
        #include <begin_vertex>
        ${this.vertexSections.body}

        `
    );

    shader.fragmentShader =
      `${this.fragmentSections.header}
        ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      "vec4 diffuseColor = vec4( diffuse, opacity );",
      `
        ${this.fragmentSections.body}
        `
    );
    return shader;
  }
}
