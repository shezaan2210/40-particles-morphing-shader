void main()
{
    vec2 uv = gl_PointCoord;
    float distanceToCentre = length(uv - 0.5);
    float alpha = 0.05 / distanceToCentre - 0.1;


    gl_FragColor = vec4(vec3(1.0), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}