import * as THREE from "three";

/**
 * A height cut on a MeshStandardMaterial with a grainy edge. Forward: surface above the cut survives (the
 * statue crumbling from the feet). Inverted: surface below the cut survives (the pillar surfacing from the ground).
 */
export type Dissolve = { uCut: { value: number }; uInvert: { value: number }; uEdge: { value: number }; uHeight: { value: number } };

export function makeDissolve(height: number, invert = false): Dissolve {
  return { uCut: { value: invert ? -1 : -1 }, uInvert: { value: invert ? 1 : 0 }, uEdge: { value: 0.06 }, uHeight: { value: height } };
}

const PARS = /* glsl */ `
  uniform float uCut;
  uniform float uInvert;
  uniform float uEdge;
  uniform float uHeight;
  varying vec3 vWorldPos;
  float dHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123); }
  float dNoise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(dHash(i), dHash(i + vec3(1,0,0)), f.x), mix(dHash(i + vec3(0,1,0)), dHash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(dHash(i + vec3(0,0,1)), dHash(i + vec3(1,0,1)), f.x), mix(dHash(i + vec3(0,1,1)), dHash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
`;

export function applyDissolve(mat: THREE.MeshStandardMaterial, d: Dissolve, key: string) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, d);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWorldPos;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\n" + PARS)
      .replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
        float h = vWorldPos.y / uHeight;
        float grain = dNoise(vWorldPos * 28.0) * 0.6 + dNoise(vWorldPos * 6.0) * 0.4;
        float edge = h + (grain - 0.5) * 0.22;
        float d = uInvert > 0.5 ? (uCut - edge) : (edge - uCut);
        if (d < 0.0) discard;
        float rim = 1.0 - smoothstep(0.0, uEdge, d);
        gl_FragColor.rgb *= 1.0 - rim * 0.35;
        // back faces are the inside of a shell seen through the cut: flat dark stone, no lighting tricks
        if (!gl_FrontFacing) gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.16, 0.16, 0.17), 0.85);`,
      );
  };
  mat.customProgramCacheKey = () => key;
}
