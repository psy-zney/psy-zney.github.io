/** Forward observer inside a finite luminous throat, crossing its open mouth at z=0. */
export const WHITE_HOLE_EXIT_GLSL = /* glsl */ `
  vec4 whiteHoleExit(vec2 uv,vec2 resolution,float p,float time) {
    vec2 screen=(uv-.5)*vec2(resolution.x/resolution.y,1.);
    float cameraZ=-3.6+5.4*p;
    if(cameraZ>=0.)return vec4(0.);
    vec3 ray=normalize(vec3(screen*.85,1.));
    float opening=smoothstep(-.35,-.20,p),mouth=.80*opening;
    vec2 planeHit=ray.xy*(-cameraZ/ray.z);
    float planeRadius=length(planeHit),edge=planeRadius-mouth;
    float angle=atan(ray.y,ray.x);
    float wallDistance=.80/max(length(ray.xy),.0001);
    float wallZ=cameraZ+wallDistance*ray.z;
    vec2 orbit=vec2(cos(angle),sin(angle));
    vec2 flow=orbit*.43+vec2(wallZ*.075-time*.025,time*.06);
    vec3 field=texture2D(noiseField,flow).rgb;
    float grain=texture2D(noiseField,flow*3.1+field.rg*.08).g;
    vec3 cloud=nebulaTile(vec2(angle/6.2831853+time*.035,wallZ*.18-time*.10));
    float strands=dot(cloud,vec3(.2126,.7152,.0722));
    float gas=pow(field.g*.35+grain*.15+strands*.50,1.4);
    float lip=exp(-abs(edge)/(.035+field.r*.075))*opening;
    float illuminated=exp(-abs(wallZ)*1.3);
    vec3 wall=vec3(.022,.028,.035)+vec3(.16,.18,.20)*gas;
    wall+=vec3(.79,.83,.86)*illuminated*(.10+1.8*gas);
    wall+=vec3(1.,.97,.90)*lip*(.15+field.r*.35+strands*1.6);
    vec3 tunnel=nebulaTunnel(uv,resolution,clamp(1.+p,0.,1.),time);
    wall=mix(tunnel,wall,smoothstep(-.35,-.06,p));
    // The destination is seen through the opening, never distorted or painted white.
    float surface=smoothstep(-.012,.012,edge);
    float halo=exp(-abs(edge)/.075)*.13*opening;
    float alpha=max(surface,halo);
    return vec4(wall,alpha);
  }
`;
