import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture,
} = tiny;


export class Assignment3 extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            torus: new defs.Torus(15, 15),
            torus2: new defs.Torus(3, 15),
            sphere: new defs.Subdivision_Sphere(4),
            circle: new defs.Regular_2D_Polygon(1, 15),
            cube: new defs.Cube(3,3),
            cube2: new defs.Cube(3,3),
            square: new defs.Square(),
            sun: new defs.Subdivision_Sphere(4),
        };

        this.shapes.cube.arrays.texture_coord.forEach(v => v.scale_by(1));
        this.shapes.square.arrays.texture_coord.forEach(v => v.scale_by(8));
        this.shapes.cube2.arrays.texture_coord.forEach(v => v.scale_by(-3.5));

        // *** Materials
        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            test2: new Material(new Gouraud_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#992828")}),
            ring: new Material(new Ring_Shader()),

            sun_material: new Material(new defs.Phong_Shader(),
                {ambient: 1}),

            sunset: new Material(new defs.Phong_Shader(), {
                color: hex_color("#edb0ff"),
                ambient: 0.5,
            }),

            day: new Material(new defs.Textured_Phong(), {
                color: hex_color("#000000"),
                ambient: 1,
                texture: new Texture("assets/resized-image-Promo.jpeg", "NEAREST")}),

            afternoon: new Material(new defs.Textured_Phong(), {
                color: hex_color("#000000"),
                ambient: 1,
                texture: new Texture("assets/resized-image-Promo-2.jpeg", "NEAREST")}),

            night: new Material(new defs.Textured_Phong(), {
                color: hex_color("#000000"),
                ambient: 1,
                texture: new Texture("assets/resized-image-Promo-3.jpeg", "NEAREST")}),
            
            ground: new Material(new defs.Textured_Phong(), {color: hex_color("#000000"), specularity: 1, ambient: 1, texture: new Texture("assets/grasstxt.jpeg", "NEAREST")}),

            building_material: new Material(new defs.Textured_Phong(), {
                ambient: 1,
                specularity: 1,
                color: hex_color("#000000"),
                texture: new Texture("assets/brks.jpg", "NEAREST")
            }),
            building_material2: new Material(new defs.Textured_Phong(), {
                ambient: 1,
                specularity: 1,
                color: hex_color("#000000"),
                texture: new Texture("assets/brks.jpeg", "NEAREST")
            }),

        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 0, 17), vec3(0, 0, 0), vec3(0, 1, 0));

        this.isDay = false;
        this.isAfternoon = false;
        this.isNight = false;

    }

    getGradientColor = function(start_color, end_color, percent) {
        // strip the leading # if it's there
        start_color = start_color.replace(/^\s*#|\s*$/g, '');
        end_color = end_color.replace(/^\s*#|\s*$/g, '');

        // convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
        if(start_color.length == 3){
            start_color = start_color.replace(/(.)/g, '$1$1');
        }

        if(end_color.length == 3){
            end_color = end_color.replace(/(.)/g, '$1$1');
        }

        // get colors
        var start_red = parseInt(start_color.substr(0, 2), 16),
            start_green = parseInt(start_color.substr(2, 2), 16),
            start_blue = parseInt(start_color.substr(4, 2), 16);

        var end_red = parseInt(end_color.substr(0, 2), 16),
            end_green = parseInt(end_color.substr(2, 2), 16),
            end_blue = parseInt(end_color.substr(4, 2), 16);

        // calculate new color
        var diff_red = end_red - start_red;
        var diff_green = end_green - start_green;
        var diff_blue = end_blue - start_blue;

        diff_red = ( (diff_red * percent) + start_red ).toString(16).split('.')[0];
        diff_green = ( (diff_green * percent) + start_green ).toString(16).split('.')[0];
        diff_blue = ( (diff_blue * percent) + start_blue ).toString(16).split('.')[0];

        // ensure 2 digits by color
        if( diff_red.length == 1 ) diff_red = '0' + diff_red
        if( diff_green.length == 1 ) diff_green = '0' + diff_green
        if( diff_blue.length == 1 ) diff_blue = '0' + diff_blue

        return '#' + diff_red + diff_green + diff_blue;
    };

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("View solar system", ["Control", "0"], () => this.attached = () => this.initial_camera_location);
        this.new_line();
        this.key_triggered_button("Day", ["Control", "d"], () => this.isDay = !this.isDay);
        this.new_line();
        this.key_triggered_button("Afternoon", ["Control", "a"], () => this.isAfternoon = !this.isAfternoon);
        this.new_line();
        this.key_triggered_button("Night", ["Control", "n"], () => this.isNight = !this.isNight);
        this.new_line();
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        let model_transform = Mat4.identity();
        const yellow = hex_color("#fac91a");
        const red = hex_color("#FF0000");
        const white = hex_color("#ffffff");

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;

        // sun path parametric equations
        let sun_y = Math.abs(20 * Math.sin(t/3 + Math.PI/2));
        let sun_x = 35 * Math.sin(t/3);

        let light_position = vec4(sun_x, sun_y, -45, 1);

        // sun stuff
        const sun_rad = 4;
        const sun_color = yellow;

        this.light_color = color(
            1.667 + Math.sin(t/500) / 3,
            1.667 + Math.sin(t/1500) / 3,
            0.667 + Math.sin(t/3500) / 3,
            1
        );

        const light_size = sun_rad ** 30;
        program_state.lights = [new Light(light_position, this.light_color, light_size)];

        let sunset_transform = Mat4.identity();
        sunset_transform = sunset_transform.times(Mat4.translation(0,0,-50))
            .times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(55,30,0));

        if (this.isDay)
        {
            this.shapes.cube.draw(context, program_state, sunset_transform, this.materials.day);
        }
        else if (this.isAfternoon)
        {
            this.shapes.cube.draw(context, program_state, sunset_transform, this.materials.afternoon);
        }
        else if (this.isNight)
        {
            this.shapes.cube.draw(context, program_state, sunset_transform, this.materials.night);
        }
        else
        {
            this.shapes.cube.draw(context, program_state, sunset_transform, this.materials.sunset);
        }

        let ground_transform = Mat4.identity();
        ground_transform = ground_transform.times(Mat4.translation(0,-4,0)).times(Mat4.rotation(Math.PI/2, 1, 0, 0))
            .times(Mat4.scale(30,30,100));
        this.shapes.square.draw(context, program_state, ground_transform, this.materials.ground);

        // let ground_transform2 = Mat4.identity();
        // ground_transform2 = ground_transform2.times(Mat4.translation(0,-4,-20))
        //     .times(Mat4.rotation(Math.PI/2, 1, 0, 0))
        //     .times(Mat4.scale(30,30,-50));
        // this.shapes.square.draw(context, program_state, ground_transform2, this.materials.ground);

        let model_transform_sun = model_transform.times(Mat4.translation(sun_x, sun_y, -45))
            .times(Mat4.scale(sun_rad, sun_rad, sun_rad));
        this.shapes.sun.draw(context, program_state, model_transform_sun, this.materials.sun_material.override({color: sun_color}));

        let path_transform = Mat4.identity();
        path_transform = path_transform.times(Mat4.translation(0,-3.9,0)).times(Mat4.rotation(Math.PI/2, 1, 0, 0)).times(Mat4.scale(4, 14, 0));
        this.shapes.square.draw(context, program_state, path_transform, this.materials.building_material);

        let column1_transform = Mat4.identity();
        column1_transform = column1_transform.times(Mat4.translation(-10, -4, -14))
            .times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(1.6,11,3));
        this.shapes.cube2.draw(context, program_state, column1_transform, this.materials.building_material);

        let column2_transform = Mat4.identity();
        column2_transform = column2_transform.times(Mat4.translation(10, -4, -14))
            .times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(1.6,11,3));
        this.shapes.cube2.draw(context, program_state, column2_transform, this.materials.building_material);

        let side1_transform = Mat4.identity();
        side1_transform = side1_transform.times(Mat4.translation(18, -4, -18))
            .times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(8,4.5,6));
        this.shapes.cube2.draw(context, program_state, side1_transform, this.materials.building_material);

        let side2_transform = Mat4.identity();
        side2_transform = side2_transform.times(Mat4.translation(-18, -4, -18))
            .times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(8,4.5,6));
        this.shapes.cube2.draw(context, program_state, side2_transform, this.materials.building_material);

        let middle_transform = Mat4.identity();
        middle_transform = middle_transform.times(Mat4.translation(0, -4, -18))
            .times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(10,7,6));
        this.shapes.cube2.draw(context, program_state, middle_transform, this.materials.building_material2);
    }
}

class Gouraud_Shader extends Shader {
    // This is a Shader using Phong_Shader as template

    constructor(num_lights = 2) {
        super();
        this.num_lights = num_lights;
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return ` 
        precision mediump float;
        const int N_LIGHTS = ` + this.num_lights + `;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS], light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale, camera_center;

        // Specifier "varying" means a variable's final value will be passed from the vertex shader
        // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the
        // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
        varying vec3 N, vertex_worldspace;
        varying vec4 vertex_color;
        // ***** PHONG SHADING HAPPENS HERE: *****                                       
        vec3 phong_model_lights( vec3 N, vec3 vertex_worldspace ){                                        
            // phong_model_lights():  Add up the lights' contributions.
            vec3 E = normalize( camera_center - vertex_worldspace );
            vec3 result = vec3( 0.0 );
            for(int i = 0; i < N_LIGHTS; i++){
                // Lights store homogeneous coords - either a position or vector.  If w is 0, the 
                // light will appear directional (uniform direction from all points), and we 
                // simply obtain a vector towards the light by directly using the stored value.
                // Otherwise if w is 1 it will appear as a point light -- compute the vector to 
                // the point light's location from the current surface point.  In either case, 
                // fade (attenuate) the light as the vector needed to reach it gets longer.  
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                                               light_positions_or_vectors[i].w * vertex_worldspace;                                             
                float distance_to_light = length( surface_to_light_vector );

                vec3 L = normalize( surface_to_light_vector );
                vec3 H = normalize( L + E );
                // Compute the diffuse and specular components from the Phong
                // Reflection Model, using Blinn's "halfway vector" method:
                float diffuse  =      max( dot( N, L ), 0.0 );
                float specular = pow( max( dot( N, H ), 0.0 ), smoothness );
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light );
                
                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                                          + light_colors[i].xyz * specularity * specular;
                result += attenuation * light_contribution;
            }
            return result;
        }`;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        return this.shared_glsl_code() + `
            attribute vec3 position, normal;                            
            // Position is expressed in object coordinates.
            
            uniform mat4 model_transform;
            uniform mat4 projection_camera_model_transform;
    
            void main(){                                                                   
                // The vertex's final resting place (in NDCS):
                gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
                // The final normal vector in screen space.
                vec3 N = normalize( mat3( model_transform ) * normal / squared_scale);
                vec3 vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
                vertex_color = vec4( shape_color.xyz * ambient, shape_color.w );
                vertex_color.xyz += phong_model_lights ( normalize(N), vertex_worldspace);
            } `;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // A fragment is a pixel that's overlapped by the current triangle.
        // Fragments affect the final image or get discarded due to depth.
        return this.shared_glsl_code() + `
            void main(){
                gl_FragColor = vertex_color;
            } `;
    }
    send_material(gl, gpu, material) {
        // send_material(): Send the desired shape-wide material qualities to the
        // graphics card, where they will tweak the Phong lighting formula.
        gl.uniform4fv(gpu.shape_color, material.color);
        gl.uniform1f(gpu.ambient, material.ambient);
        gl.uniform1f(gpu.diffusivity, material.diffusivity);
        gl.uniform1f(gpu.specularity, material.specularity);
        gl.uniform1f(gpu.smoothness, material.smoothness);
    }

    send_gpu_state(gl, gpu, gpu_state, model_transform) {
        // send_gpu_state():  Send the state of our whole drawing context to the GPU.
        const O = vec4(0, 0, 0, 1), camera_center = gpu_state.camera_transform.times(O).to3();
        gl.uniform3fv(gpu.camera_center, camera_center);
        // Use the squared scale trick from "Eric's blog" instead of inverse transpose matrix:
        const squared_scale = model_transform.reduce(
            (acc, r) => {
                return acc.plus(vec4(...r).times_pairwise(r))
            }, vec4(0, 0, 0, 0)).to3();
        gl.uniform3fv(gpu.squared_scale, squared_scale);
        // Send the current matrices to the shader.  Go ahead and pre-compute
        // the products we'll need of the of the three special matrices and just
        // cache and send those.  They will be the same throughout this draw
        // call, and thus across each instance of the vertex shader.
        // Transpose them since the GPU expects matrices as column-major arrays.
        const PCM = gpu_state.projection_transform.times(gpu_state.camera_inverse).times(model_transform);
        gl.uniformMatrix4fv(gpu.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        gl.uniformMatrix4fv(gpu.projection_camera_model_transform, false, Matrix.flatten_2D_to_1D(PCM.transposed()));

        // Omitting lights will show only the material color, scaled by the ambient term:
        if (!gpu_state.lights.length)
            return;

        const light_positions_flattened = [], light_colors_flattened = [];
        for (let i = 0; i < 4 * gpu_state.lights.length; i++) {
            light_positions_flattened.push(gpu_state.lights[Math.floor(i / 4)].position[i % 4]);
            light_colors_flattened.push(gpu_state.lights[Math.floor(i / 4)].color[i % 4]);
        }
        gl.uniform4fv(gpu.light_positions_or_vectors, light_positions_flattened);
        gl.uniform4fv(gpu.light_colors, light_colors_flattened);
        gl.uniform1fv(gpu.light_attenuation_factors, gpu_state.lights.map(l => l.attenuation));
    }

    update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
        // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader
        // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
        // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or
        // program (which we call the "Program_State").  Send both a material and a program state to the shaders
        // within this function, one data field at a time, to fully initialize the shader for a draw.

        // Fill in any missing fields in the Material object with custom defaults for this shader:
        const defaults = {color: color(0, 0, 0, 1), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40};
        material = Object.assign({}, defaults, material);

        this.send_material(context, gpu_addresses, material);
        this.send_gpu_state(context, gpu_addresses, gpu_state, model_transform);
    }
}

class Ring_Shader extends Shader {
    update_GPU(context, gpu_addresses, graphics_state, model_transform, material) {
        // update_GPU():  Defining how to synchronize our JavaScript's variables to the GPU's:
        const [P, C, M] = [graphics_state.projection_transform, graphics_state.camera_inverse, model_transform],
            PCM = P.times(C).times(M);
        context.uniformMatrix4fv(gpu_addresses.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        context.uniformMatrix4fv(gpu_addresses.projection_camera_model_transform, false,
            Matrix.flatten_2D_to_1D(PCM.transposed()));
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return `
        precision mediump float;
        varying vec4 point_position;
        varying vec4 center;
        `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        // TODO:  Complete the main function of the vertex shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        attribute vec3 position;
        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;
        
        void main(){
          center = model_transform * vec4(0.0, 0.0, 0.0, 1.0);
          point_position = model_transform * vec4( position, 1.0);
          gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
        }`;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // TODO:  Complete the main function of the fragment shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        void main(){
          float sin_scalar = sin(30.0 * distance(point_position.xyz, center.xyz));
          gl_FragColor = sin_scalar * vec4( 0.6, 0.4, 0.1, 1);
        }`;
    }
}