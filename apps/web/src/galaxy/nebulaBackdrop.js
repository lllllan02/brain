import {MOTION, damp} from '../motion/tokens.js';
import {BackSide, Mesh, ShaderMaterial, SphereGeometry} from 'three';
import {nebulaLandmarks} from './nebulaLandmarks';

// Seamless directional gas on a distant sky, without photographic textures.
// Camera rotation reveals new clouds; translation keeps the sky distant.
export class NebulaBackdrop {
  constructor(scene) {
    this.scene = scene;
    this.intensity = .72;
    this.material = new ShaderMaterial({
      side: BackSide, depthTest: false, depthWrite: false, transparent: true,
      uniforms: {uIntensity: {value: this.intensity}},
      vertexShader: `
        varying vec3 vDirection;
        void main() {
          vDirection = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uIntensity;
        varying vec3 vDirection;
        float hash(vec3 p) {
          p = fract(p * .3183099 + vec3(.13, .27, .41));
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }
        float noise(vec3 p) {
          vec3 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                         mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                         mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
        }
        float fbm(vec3 p) {
          float sum = 0.0, amplitude = .48;
          for (int i = 0; i < 6; i++) {
            sum += amplitude * noise(p);
            p = mat3(.00, .80, .60, -.80, .36, -.48, -.60, -.48, .64) * p * 2.11 + vec3(17.1, 9.2, 3.8);
            amplitude *= .53;
          }
          return sum;
        }
        ${nebulaLandmarks}
        void main() {
          vec3 d = normalize(vDirection);
          vec3 p = d * 4.2 + vec3(4.2, 7.8, 1.6);
          vec3 warp = vec3(noise(p + 5.7), noise(p + 19.3), noise(p - 8.1));
          vec3 q = p + (warp - .5) * .65;
          float gas = fbm(q);
          float detail = fbm(q * 4.5 + 13.0);
          float dust = fbm(q * 2.3 + 31.0);
          float bandDistance = (d.y + .24 * d.x + .16 + (noise(p * .7) - .5) * .9) * 2.6;
          float band = exp(-bandDistance * bandDistance);
          // Emission follows cloud density, never a single iso-contour. Several
          // scales of dust break up the gas, avoiding smooth water-like outlines.
          float density = pow(max(gas - .37, 0.0) * 2.7, 2.2) * band;
          float extinction = exp(-max(dust - .39, 0.0) * 9.0);
          float filaments = pow(max(detail - .27, 0.0) * 2.5, 2.6);
          float glow = density * extinction * (.25 + filaments * 2.6);
          float warmPocket = smoothstep(.42, .70, noise(q * .65 + 8.0));
          vec3 gasColor = mix(vec3(.026, .055, .11), vec3(.16, .035, .038), warmPocket);
          // Local emission pockets leave dark space between the colored clouds.
          // All masks use world directions, so the clouds remain explorable.
          float quietSky = .64 * mix(.12, 1.0, smoothstep(.43, .68, noise(p * .6 + 7.0)));
          quietSky = mix(quietSky, max(quietSky, .38), warmPocket);
          vec3 silver = vec3(.13, .17, .22) * density * pow(filaments, 2.0) * extinction;
          vec4 columns = pillars(d);
          vec3 landmarks = columns.rgb + ringNebula(d).rgb + spiralGalaxy(d).rgb;
          vec3 color = ((gasColor * glow + silver * .3) * quietSky * (1.0 - columns.a) + landmarks) * uIntensity;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
    this.mesh = new Mesh(new SphereGeometry(12000, 48, 32), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -20;
    scene.add(this.mesh);
  }

  update(camera, preset, categoryBlend, reading, dt, reduced) {
    this.mesh.position.copy(camera.position);
    const base = {nebula: .72, galaxy: .44, deepfield: .72}[preset] ?? .72;
    const target = base * (1 - categoryBlend * .4) * (reading ? .65 : 1);
    this.intensity += (target - this.intensity) * (reduced ? 1 : damp(dt, MOTION.enter / 1000));
    this.material.uniforms.uIntensity.value = this.intensity;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
