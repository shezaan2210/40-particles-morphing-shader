uniform vec3 uColorA;
uniform vec3 uColorB;

varying vec3 vColor;

void main()
{
    // mix colors
    vec3 mainColor = mix(uColorA, uColorB, vColor);

    vec2 uv = gl_PointCoord;
    float distanceToCentre = length(uv - 0.5);
    float alpha = 0.05 / distanceToCentre - 0.1;


    gl_FragColor = vec4(mainColor, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}