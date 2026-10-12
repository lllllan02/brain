// Stylized landmarks, not an astronomical map. Each occupies a fixed direction
// on the procedural sky and shares its noise functions and exposure.
export const nebulaLandmarks = /* glsl */ `
  vec3 skyPatch(vec3 direction, vec3 heading, vec2 scale) {
    vec3 forward = normalize(heading);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);
    float facing = dot(direction, forward);
    return vec3(vec2(dot(direction, right), dot(direction, up)) / max(facing, .01) / scale, facing);
  }
  float dustColumn(vec2 p, vec2 base, vec2 tip, float root, float crown) {
    vec2 axis = tip - base;
    float t = clamp(dot(p - base, axis) / dot(axis, axis), 0.0, 1.0);
    return length(p - base - axis * t) - mix(root, crown, t);
  }
  vec4 pillars(vec3 direction) {
    vec3 region = skyPatch(direction, vec3(-.97, -.18, .16), vec2(.145, .17));
    vec2 uv = region.xy;
    if (region.z < .65 || length(uv) > 2.3) return vec4(0.0);
    vec3 p = vec3(uv * 4.0, 5.8);
    float grains = fbm(p * 3.7);
    vec2 warped = uv + (vec2(fbm(p), fbm(p + 16.3)) - .5) * .24;
    warped.x += sin(uv.y * 7.0) * .035;
    float shape = min(dustColumn(warped, vec2(-.64,-1.3), vec2(-.43,.15), .38,.14),
                      dustColumn(warped, vec2(-.08,-1.3), vec2(.02,.25), .32,.12));
    shape = min(shape, dustColumn(warped, vec2(.02,.25), vec2(.21,.76), .12,.055));
    shape = min(shape, (length((warped - vec2(.12,.68)) * vec2(.7,1.4)) - .11));
    shape = min(shape, dustColumn(warped, vec2(-.43,.06), vec2(-.68,.3), .13,.07));
    shape = min(shape, dustColumn(warped, vec2(.57,-1.35), vec2(.65,-.10), .35,.13));
    shape += (fbm(p * 1.6) - .5) * .15 + (grains - .5) * .055;
    float envelope = (1.0 - smoothstep(1.4, 2.25, length(uv))) * smoothstep(-1.7, -.9, uv.y);
    float solid = 1.0 - smoothstep(-.025,.04,shape);
    float detail = pow(max(grains - .24, 0.0) * 2.4, 2.4);
    // Broken illuminated skins around opaque dust, with diffuse blue gas outside.
    float rim = exp(-abs(shape) * 32.0) * (.18 + detail * 1.7);
    float halo = exp(-max(shape, 0.0) * 3.8) * (1.0 - solid) * (.35 + detail);
    float light = smoothstep(-.5, .8, uv.y - uv.x * .4);
    vec3 color = vec3(.024,.012,.009) * solid * detail;
    color += vec3(.087,.076,.064) * rim * light;
    color += vec3(.015,.036,.071) * halo;
    return vec4(color * envelope, solid * envelope * .92);
  }
  vec4 ringNebula(vec3 direction) {
    vec3 region = skyPatch(direction, vec3(.33,.22,-.92), vec2(.15,.17));
    vec2 uv = region.xy;
    if (region.z < .7 || length(uv) > 2.0) return vec4(0.0);
    vec3 p = vec3(uv * 5.0, 23.6);
    float grain = fbm(p * 2.8);
    float radius = length(uv * vec2(1.0, 1.14));
    float r = radius + (fbm(p) - .5) * .20;
    float shellDistance = (r - .74) * 7.5;
    float shell = exp(-shellDistance * shellDistance);
    float fibers = pow(max(grain - .23, 0.0) * 2.1, 2.0);
    float outer = smoothstep(.65, .94, r);
    vec3 color = mix(vec3(.035,.095,.15), vec3(.13,.045,.037), outer) * shell * fibers;
    color += vec3(.008,.024,.05) * exp(-radius * radius * 3.0);
    color += vec3(.22,.26,.3) * exp(-dot(uv,uv) * 6500.0);
    return vec4(color, 0.0);
  }
  vec4 spiralGalaxy(vec3 direction) {
    vec3 region = skyPatch(direction, vec3(.58,-.12,.81), vec2(.24,.24));
    vec2 uv = mat2(.91,-.415,.415,.91) * region.xy;
    uv.y *= 1.7;
    float r = length(uv);
    if (region.z < .65 || r > 2.2) return vec4(0.0);
    vec3 p = vec3(uv * 6.0, 47.2);
    float grains = fbm(p * 2.5);
    float angle = atan(uv.y, uv.x);
    float wave = cos(angle * 2.0 - log(max(r,.045)) * 4.7 + (fbm(p) - .5) * 1.4);
    float arms = pow(max(wave, 0.0), 3.0);
    float disk = exp(-r * r * 1.4) * smoothstep(.12,.35,r);
    float detail = pow(max(grains - .22, 0.0) * 2.2, 2.0);
    float core = exp(-r * r * 36.0);
    vec3 color = vec3(.045,.10,.19) * arms * disk * detail;
    color += vec3(.085,.077,.062) * core;
    color += vec3(.037,.029,.024) * exp(-r * r * 4.0) * detail;
    return vec4(color * (1.0 - smoothstep(1.5,2.2,r)), 0.0);
  }
`;
