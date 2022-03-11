import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture,
} = tiny;

const {Cube, Textured_Phong} = defs

import {Color_Phong_Shader, Shadow_Textured_Phong_Shader,
    Depth_Texture_Shader_2D, Buffered_Texture, LIGHT_DEPTH_TEX_SIZE} from './examples/shadow-demo-shaders.js'

// 2D shape, to display the texture buffer
const Square =
    class Square extends tiny.Vertex_Buffer {
        constructor() {
            super("position", "normal", "texture_coord");
            this.arrays.position = [
                vec3(0, 0, 0), vec3(1, 0, 0), vec3(0, 1, 0),
                vec3(1, 1, 0), vec3(1, 0, 0), vec3(0, 1, 0)
            ];
            this.arrays.normal = [
                vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1),
                vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1),
            ];
            this.arrays.texture_coord = [
                vec(0, 0), vec(1, 0), vec(0, 1),
                vec(1, 1), vec(1, 0), vec(0, 1)
            ]
        }
    }

export class Assignment3 extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        this.hover = this.swarm = false;
        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            sphere: new defs.Subdivision_Sphere(4),
            circle: new defs.Regular_2D_Polygon(1, 25),
            cube: new defs.Cube(3,3),
            cube2: new defs.Cube(3,3),
            square: new defs.Square(),
            square2: new defs.Square(),
            sun: new defs.Subdivision_Sphere(4),
            plant: new defs.Subdivision_Sphere(4),
            square_2d: new defs.Square(),
        };

        this.shapes.cube.arrays.texture_coord.forEach(v => v.scale_by(1));
        this.shapes.square.arrays.texture_coord.forEach(v => v.scale_by(8));
        this.shapes.cube2.arrays.texture_coord.forEach(v => v.scale_by(-1));
        this.shapes.plant.arrays.texture_coord.forEach(v => v.scale_by(-2));
        this.shapes.square2.arrays.texture_coord.forEach(v => v.scale_by(10));

        // *** Materials
        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#000000")}),
            sun_material: new Material(new defs.Phong_Shader(),
                {ambient: 1}),
            sunset: new Material(new defs.Phong_Shader(),
                {color: hex_color("#edb0ff"), ambient: 0.5}),
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
            moving_sunset: new Material(new Texture_Scroll_X(), {
                color: hex_color("#000000"),
                ambient: 1,
                texture: new Texture("assets/sunset.jpg", "LINEAR_MIPMAP_LINEAR")}),
        }

        // grass floor material
        this.floor1 = new Material(new Shadow_Textured_Phong_Shader(), {
            color: hex_color("#000000"), ambient: 1, diffusivity: 1, specularity: 0.4, smoothness: 64,
            color_texture: new Texture("assets/grasstxt.jpeg"),
            light_depth_texture: null
        });
        // dirt floor material
        this.floor2 = new Material(new Shadow_Textured_Phong_Shader(), {
            color: hex_color("#888888"), ambient: 1, diffusivity: 1, specularity: 0.4, smoothness: 64,
            color_texture: new Texture("assets/dirt_resized.jpeg"),
            light_depth_texture: null
        });
        // light source material
        this.light_src = new Material(new defs.Phong_Shader(), {
            color: hex_color("#fac91a"),
            ambient: 1,
            diffusivity: 0,
            specularity: 0
        });
        // building texture
        this.building = new Material(new Shadow_Textured_Phong_Shader(), {
            color: color(.5, .5, .5, 1),
            ambient: .4, diffusivity: .5, specularity: .5,
            color_texture: new Texture("assets/brks.jpg"),
            light_depth_texture: null
        });
        // plant texture
        this.plants = new Material(new Shadow_Textured_Phong_Shader(), {
            color: hex_color("#000000"),
            ambient: .4, diffusivity: .5, specularity: .5,
            color_texture: new Texture("assets/roses_edit.jpg"),
            light_depth_texture: null
        });

        // For depth texture display
        this.depth_tex =  new Material(new Depth_Texture_Shader_2D(), {
            color: color(0, 0, .0, 1),
            ambient: 1, diffusivity: 0, specularity: 0, texture: null
        });

        this.initial_camera_location = Mat4.look_at(vec3(0, 0, 17), vec3(0, 0, 0), vec3(0, 1, 0));

        this.isDay = false;
        this.isAfternoon = false;
        this.isNight = false

        this.init_ok = false;
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("View entire scene", ["Control", "0"], () => this.attached = () => this.initial_camera_location);
        this.new_line();
        this.key_triggered_button("Day", ["Control", "d"], () => {
            this.isDay = true;
            this.isNight = false;
            this.isAfternoon = false;

        });
        this.new_line();
        this.key_triggered_button("Afternoon", ["Control", "a"], () => {
            this.isDay = false;
            this.isNight = false;
            this.isAfternoon = true;
        });
        this.new_line();
        this.key_triggered_button("Night", ["Control", "n"], () => {
            this.isDay = false;
            this.isNight = true;
            this.isAfternoon = false;
        });
        this.new_line();
        this.key_triggered_button("Attach to plant 1", ["Control", "1"], () => this.attached = () => this.plant_1);
        // this.new_line();
        this.key_triggered_button("Attach to plant 2", ["Control", "2"], () => this.attached = () => this.plant_2);
        // this.new_line();
        this.key_triggered_button("Attach to plant 3", ["Control", "3"], () => this.attached = () => this.plant_3);
        // this.new_line();
        this.key_triggered_button("Attach to plant 4", ["Control", "4"], () => this.attached = () => this.plant_4);
        // this.new_line();
        this.key_triggered_button("Attach to plant 5", ["Control", "5"], () => this.attached = () => this.plant_5);
        // this.new_line();
        this.key_triggered_button("Attach to plant 6", ["Control", "6"], () => this.attached = () => this.plant_6);
        // this.new_line();
        this.key_triggered_button("Attach to plant 7", ["Control", "7"], () => this.attached = () => this.plant_7);
        // this.new_line();
        this.key_triggered_button("Attach to plant 8", ["Control", "8"], () => this.attached = () => this.plant_8);
        // this.new_line();
    }

    texture_buffer_init(gl) {
        // Depth Texture
        this.lightDepthTexture = gl.createTexture();
        // Bind it to TinyGraphics
        this.light_depth_texture = new Buffered_Texture(this.lightDepthTexture);
        this.floor1.light_depth_texture = this.light_depth_texture
        this.floor2.light_depth_texture = this.light_depth_texture
        this.building.light_depth_texture = this.light_depth_texture
        this.plants.light_depth_texutre = this.light_depth_texture

        this.lightDepthTextureSize = LIGHT_DEPTH_TEX_SIZE;
        gl.bindTexture(gl.TEXTURE_2D, this.lightDepthTexture);
        gl.texImage2D(
            gl.TEXTURE_2D,      // target
            0,                  // mip level
            gl.DEPTH_COMPONENT, // internal format
            this.lightDepthTextureSize,   // width
            this.lightDepthTextureSize,   // height
            0,                  // border
            gl.DEPTH_COMPONENT, // format
            gl.UNSIGNED_INT,    // type
            null);              // data
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Depth Texture Buffer
        this.lightDepthFramebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightDepthFramebuffer);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,       // target
            gl.DEPTH_ATTACHMENT,  // attachment point
            gl.TEXTURE_2D,        // texture target
            this.lightDepthTexture,         // texture
            0);                   // mip level
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // create a color texture of the same size as the depth texture
        // see article why this is needed_
        this.unusedTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.unusedTexture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            this.lightDepthTextureSize,
            this.lightDepthTextureSize,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null,
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        // attach it to the framebuffer
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,        // target
            gl.COLOR_ATTACHMENT0,  // attachment point
            gl.TEXTURE_2D,         // texture target
            this.unusedTexture,         // texture
            0);                    // mip level
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    render_scene(context, program_state, shadow_pass, draw_light_source=false, draw_shadow=false) {
        // shadow_pass: true if this is the second pass that draw the shadow.
        // draw_light_source: true if we want to draw the light source.
        // draw_shadow: true if we want to draw the shadow

        // STAYS IN DISPLAY
        const time = program_state.animation_time / 1000;
        // const gl = context.context;

        // sun path parametric equations
        let sun_y = Math.abs(20 * Math.sin(time/3 + Math.PI/2));
        let sun_x = 35 * Math.sin(time/3);

        let light_position = this.light_position;
        if (this.isDay) {
            this.light_position = vec4(35 * Math.sin(12/3), Math.abs(20 * Math.sin(12/3 + Math.PI/2)), -45, 1);
        }
        else if (this.isAfternoon) {
            this.light_position = vec4(35 * Math.sin(9/3), Math.abs(20 * Math.sin(9/3 + Math.PI/2)), -45, 1);
        }
        else if (this.isNight) {
            this.light_position = vec4(35 * Math.sin(6/3), Math.abs(20 * Math.sin(6/3 + Math.PI/2)), -45, 1);
        }
        else {
            this.light_position = vec4(this.sun_x, this.sun_y, -45, 1);
        }
        this.light_color = hex_color("#fac91a");

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;

        // start replacement
        program_state.draw_shadow = draw_shadow;

        if (draw_light_source && shadow_pass) {
            let draw_transform = Mat4.identity();
            draw_transform = draw_transform.times(Mat4.translation(light_position[0], light_position[1], light_position[2]))
                .times(Mat4.scale(4,4,4));
            this.shapes.sphere.draw(context, program_state, draw_transform, this.light_src.override({color: this.light_color}));
        }

        // ground or grass
        let ground_transform = Mat4.identity();
        ground_transform = ground_transform.times(Mat4.translation(0,-4,0))
            .times(Mat4.rotation(Math.PI/2, 1, 0, 0))
            .times(Mat4.scale(30,30,100));
        this.shapes.square.draw(context, program_state, ground_transform, shadow_pass? this.floor1 : this.materials.day);

        // path on the ground
        let path_transform = Mat4.identity();
        path_transform = path_transform.times(Mat4.translation(0,-3.9,0))
            .times(Mat4.rotation(Math.PI/2, 1, 0, 0))
            .times(Mat4.scale(4, 14, 0));
        this.shapes.square2.draw(context, program_state, path_transform, shadow_pass? this.floor2 : this.materials.day);

        // sunset
        let sunset_transform = Mat4.identity();
        sunset_transform = sunset_transform.times(Mat4.translation(0,0,-50))
            .times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(55,30,0));
        if (this.isDay) {
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
            this.shapes.cube.draw(context, program_state, sunset_transform, this.materials.day);
        }

        // sun
        let sun_rad = this.sun_rad;
        this.sun_rad = 4;

        // putting together royce
        let column1_transform = Mat4.identity();
        column1_transform = column1_transform.times(Mat4.translation(-10, -4, -14))
            .times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(1.6,11,3));
        this.shapes.cube2.draw(context, program_state, column1_transform, this.building);

        let column2_transform = Mat4.identity();
        column2_transform = column2_transform.times(Mat4.translation(10, -4, -14))
            .times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(1.6,11,3));
        this.shapes.cube2.draw(context, program_state, column2_transform, this.building);

        let side1_transform = Mat4.identity();
        side1_transform = side1_transform.times(Mat4.translation(18, -4, -18))
            .times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(8,4.5,6));
        this.shapes.cube2.draw(context, program_state, side1_transform, this.building);

        let side2_transform = Mat4.identity();
        side2_transform = side2_transform.times(Mat4.translation(-18, -4, -18))
            .times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(8,4.5,6));
        this.shapes.cube2.draw(context, program_state, side2_transform, this.building);

        let middle_transform = Mat4.identity();
        middle_transform = middle_transform.times(Mat4.translation(0, -4, -18))
            .times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(10,7,6));
        this.shapes.cube2.draw(context, program_state, middle_transform, this.building);

        //plant stuff
        const plant_rad = 0.5;

        let plant_transform = Mat4.identity();
        plant_transform = plant_transform.times(Mat4.translation(-10,-3.5,2)).times(Mat4.rotation(Math.PI/2, 1, 0, 0))
            .times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.plants);
        let plant_transform2 = Mat4.identity();
        plant_transform = plant_transform2.times(Mat4.translation(-9.5,-3.5,1.5)).times(Mat4.scale(1.7*plant_rad,1.7*plant_rad,1.7*plant_rad));
        this.plant_1 = plant_transform;
        this.shapes.plant.draw(context, program_state, plant_transform, this.plants);
        let plant_transform3 = Mat4.identity();
        plant_transform = plant_transform3.times(Mat4.translation(-8.7,-3.5,2.1)).times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.plants);

        plant_transform = Mat4.identity();
        plant_transform = plant_transform.times(Mat4.translation(7,-3.5,2)).times(Mat4.rotation(Math.PI/2, 1, 0, 0))
            .times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.plants);
        plant_transform2 = Mat4.identity();
        plant_transform = plant_transform2.times(Mat4.translation(6.5,-3.5,1.5)).times(Mat4.scale(1.7*plant_rad,1.7*plant_rad,1.7*plant_rad));
        this.plant_2 = plant_transform;
        this.shapes.plant.draw(context, program_state, plant_transform, this.plants);
        plant_transform3 = Mat4.identity();
        plant_transform = plant_transform3.times(Mat4.translation(5.7,-3.5,2.1)).times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.plants);

        plant_transform = Mat4.identity();
        plant_transform = plant_transform.times(Mat4.translation(10,-3.5,10)).times(Mat4.rotation(Math.PI/2, 1, 0, 0))
            .times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.plants);
        plant_transform2 = Mat4.identity();
        plant_transform = plant_transform2.times(Mat4.translation(9.5,-3.5,9.5)).times(Mat4.scale(1.7*plant_rad,1.7*plant_rad,1.7*plant_rad));
        this.plant_3 = plant_transform;
        this.shapes.plant.draw(context, program_state, plant_transform, this.plants);
        plant_transform3 = Mat4.identity();
        plant_transform = plant_transform3.times(Mat4.translation(8.7,-3.5,10.1)).times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.plants);

        plant_transform = Mat4.identity();
        plant_transform = plant_transform.times(Mat4.translation(13.8,-3.5,-4)).times(Mat4.rotation(Math.PI/2, 1, 0, 0))
            .times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.plants);
        plant_transform2 = Mat4.identity();
        plant_transform = plant_transform2.times(Mat4.translation(14.5,-3.5,-4.5)).times(Mat4.scale(1.7*plant_rad,1.7*plant_rad,1.7*plant_rad));
        this.plant_4 = plant_transform;
        this.shapes.plant.draw(context, program_state, plant_transform, this.plants);
        plant_transform3 = Mat4.identity();
        plant_transform = plant_transform3.times(Mat4.translation(15.3,-3.5,-5.1)).times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.plants);

        plant_transform = Mat4.identity();
        plant_transform = plant_transform.times(Mat4.translation(-13.8,-3.5,-4)).times(Mat4.rotation(Math.PI/2, 1, 0, 0))
            .times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.plants);
        plant_transform2 = Mat4.identity();
        plant_transform = plant_transform2.times(Mat4.translation(-14.5,-3.5,-4.5)).times(Mat4.scale(1.7*plant_rad,1.7*plant_rad,1.7*plant_rad));
        this.plant_5 = plant_transform;
        this.shapes.plant.draw(context, program_state, plant_transform, this.plants);
        plant_transform3 = Mat4.identity();
        plant_transform = plant_transform3.times(Mat4.translation(-15.3,-3.5,-5.1)).times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.plants);

        plant_transform = Mat4.identity();
        plant_transform = plant_transform.times(Mat4.translation(-10,-3.5,-7)).times(Mat4.rotation(Math.PI/2, 1, 0, 0))
            .times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.plants);
        plant_transform2 = Mat4.identity();
        plant_transform = plant_transform2.times(Mat4.translation(-9.5,-3.5,-6.5)).times(Mat4.scale(1.7*plant_rad,1.7*plant_rad,1.7*plant_rad));
        this.plant_6 = plant_transform;
        this.shapes.plant.draw(context, program_state, plant_transform, this.plants);
        plant_transform3 = Mat4.identity();
        plant_transform = plant_transform3.times(Mat4.translation(-8.7,-3.5,-5.9)).times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.plants);

        plant_transform = Mat4.identity();
        plant_transform = plant_transform.times(Mat4.translation(-15,-3.5,7)).times(Mat4.rotation(Math.PI/2, 1, 0, 0))
            .times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.plants);
        plant_transform2 = Mat4.identity();
        plant_transform = plant_transform2.times(Mat4.translation(-14.5,-3.5,6.5)).times(Mat4.scale(1.7*plant_rad,1.7*plant_rad,1.7*plant_rad));
        this.plant_7 = plant_transform;
        this.shapes.plant.draw(context, program_state, plant_transform, this.plants);
        plant_transform3 = Mat4.identity();
        plant_transform = plant_transform3.times(Mat4.translation(-13.7,-3.5,5.9)).times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.plants);

        plant_transform = Mat4.identity();
        plant_transform = plant_transform.times(Mat4.translation(15,-3.5,7)).times(Mat4.rotation(Math.PI/2, 1, 0, 0))
            .times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.plants);
        plant_transform2 = Mat4.identity();
        plant_transform = plant_transform2.times(Mat4.translation(14.5,-3.5,6.5)).times(Mat4.scale(1.7*plant_rad,1.7*plant_rad,1.7*plant_rad));
        this.plant_8 = plant_transform;
        this.shapes.plant.draw(context, program_state, plant_transform, this.plants);
        plant_transform3 = Mat4.identity();
        plant_transform = plant_transform3.times(Mat4.translation(13.7,-3.5,5.9)).times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.plants);
        // end of plant stuff

        // middle middle doorway
        let column_transform = Mat4.identity();
        column_transform = column_transform.times(Mat4.translation(0,-4,-11.9)).times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(2,4,6));
        this.shapes.square.draw(context, program_state, column_transform, this.materials.test);
        column_transform = column_transform.times(Mat4.translation(0,-0.4,0))
        this.shapes.circle.draw(context, program_state, column_transform, this.materials.test);

        // middle right doorway
        column_transform = Mat4.identity();
        column_transform = column_transform.times(Mat4.translation(6,-4,-11.9)).times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(1,3,4));
        this.shapes.square.draw(context, program_state, column_transform, this.materials.test);
        column_transform = column_transform.times(Mat4.translation(0,-0.4,0))
        this.shapes.circle.draw(context, program_state, column_transform, this.materials.test);

        // middle left doorway
        column_transform = Mat4.identity();
        column_transform = column_transform.times(Mat4.translation(-6,-4,-11.9)).times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(1,3,4));
        this.shapes.square.draw(context, program_state, column_transform, this.materials.test);
        column_transform = column_transform.times(Mat4.translation(0,-0.4,0))
        this.shapes.circle.draw(context, program_state, column_transform, this.materials.test);

        // side building blackout windows
        column_transform = Mat4.identity();
        column_transform = column_transform.times(Mat4.translation(-16,-4,-11.9)).times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(0.75,1.5,1.5));
        this.shapes.square.draw(context, program_state, column_transform, this.materials.test);
        column_transform = column_transform.times(Mat4.translation(0,-0.4,0))
        this.shapes.circle.draw(context, program_state, column_transform, this.materials.test);

        column_transform = Mat4.identity();
        column_transform = column_transform.times(Mat4.translation(-19,-4,-11.9)).times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(0.75,1.5,1.5));
        this.shapes.square.draw(context, program_state, column_transform, this.materials.test);
        column_transform = column_transform.times(Mat4.translation(0,-0.4,0))
        this.shapes.circle.draw(context, program_state, column_transform, this.materials.test);

        column_transform = Mat4.identity();
        column_transform = column_transform.times(Mat4.translation(-13,-4,-11.9)).times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(0.75,1.5,1.5));
        this.shapes.square.draw(context, program_state, column_transform, this.materials.test);
        column_transform = column_transform.times(Mat4.translation(0,-0.4,0))
        this.shapes.circle.draw(context, program_state, column_transform, this.materials.test);

        column_transform = Mat4.identity();
        column_transform = column_transform.times(Mat4.translation(-22,-4,-11.9)).times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(0.75,1.5,1.5));
        this.shapes.square.draw(context, program_state, column_transform, this.materials.test);
        column_transform = column_transform.times(Mat4.translation(0,-0.4,0))
        this.shapes.circle.draw(context, program_state, column_transform, this.materials.test);

        column_transform = Mat4.identity();
        column_transform = column_transform.times(Mat4.translation(-24,-4,-11.9)).times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(0.75,1.5,1.5));
        this.shapes.square.draw(context, program_state, column_transform, this.materials.test);
        column_transform = column_transform.times(Mat4.translation(0,-0.4,0))
        this.shapes.circle.draw(context, program_state, column_transform, this.materials.test);

        column_transform = Mat4.identity();
        column_transform = column_transform.times(Mat4.translation(16,-4,-11.9)).times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(0.75,1.5,1.5));
        this.shapes.square.draw(context, program_state, column_transform, this.materials.test);
        column_transform = column_transform.times(Mat4.translation(0,-0.4,0))
        this.shapes.circle.draw(context, program_state, column_transform, this.materials.test);
        column_transform = Mat4.identity();

        column_transform = Mat4.identity();
        column_transform = column_transform.times(Mat4.translation(19,-4,-11.9)).times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(0.75,1.5,1.5));
        this.shapes.square.draw(context, program_state, column_transform, this.materials.test);
        column_transform = column_transform.times(Mat4.translation(0,-0.4,0))
        this.shapes.circle.draw(context, program_state, column_transform, this.materials.test);

        column_transform = Mat4.identity();
        column_transform = column_transform.times(Mat4.translation(13,-4,-11.9)).times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(0.75,1.5,1.5));
        this.shapes.square.draw(context, program_state, column_transform, this.materials.test);
        column_transform = column_transform.times(Mat4.translation(0,-0.4,0))
        this.shapes.circle.draw(context, program_state, column_transform, this.materials.test);

        column_transform = Mat4.identity();
        column_transform = column_transform.times(Mat4.translation(22,-4,-11.9)).times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(0.75,1.5,1.5));
        this.shapes.square.draw(context, program_state, column_transform, this.materials.test);
        column_transform = column_transform.times(Mat4.translation(0,-0.4,0))
        this.shapes.circle.draw(context, program_state, column_transform, this.materials.test);

        column_transform = Mat4.identity();
        column_transform = column_transform.times(Mat4.translation(24,-4,-11.9)).times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(0.75,1.5,1.5));
        this.shapes.square.draw(context, program_state, column_transform, this.materials.test);
        column_transform = column_transform.times(Mat4.translation(0,-0.4,0))
        this.shapes.circle.draw(context, program_state, column_transform, this.materials.test);

        // column's blackout windows
        column_transform = Mat4.identity();
        column_transform = column_transform.times(Mat4.translation(-10,-3,-10.9)).times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(0.65,1,1));
        this.shapes.square.draw(context, program_state, column_transform, this.materials.test);
        column_transform = column_transform.times(Mat4.translation(0,-0.4,0))
        this.shapes.circle.draw(context, program_state, column_transform, this.materials.test);

        column_transform = Mat4.identity();
        column_transform = column_transform.times(Mat4.translation(-10,2,-10.9)).times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(0.65,1,1));
        this.shapes.square.draw(context, program_state, column_transform, this.materials.test);
        column_transform = column_transform.times(Mat4.translation(0,-0.4,0))
        this.shapes.circle.draw(context, program_state, column_transform, this.materials.test);

        column_transform = Mat4.identity();
        column_transform = column_transform.times(Mat4.translation(10,-3,-10.9)).times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(0.65,1,1));
        this.shapes.square.draw(context, program_state, column_transform, this.materials.test);
        column_transform = column_transform.times(Mat4.translation(0,-0.4,0))
        this.shapes.circle.draw(context, program_state, column_transform, this.materials.test);

        column_transform = Mat4.identity();
        column_transform = column_transform.times(Mat4.translation(10,2,-10.9)).times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(0.65,1,1));
        this.shapes.square.draw(context, program_state, column_transform, this.materials.test);
        column_transform = column_transform.times(Mat4.translation(0,-0.4,0))
        this.shapes.circle.draw(context, program_state, column_transform, this.materials.test);
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.

        // STAYS IN DISPLAY
        const t = program_state.animation_time / 1000;
        const gl = context.context;

        // STAYS IN DISPLAY
        if (!this.init_ok) {
            const ext = gl.getExtension('WEBGL_depth_texture');
            if (!ext) {
                return alert('need WEBGL_depth_texture');  // eslint-disable-line
            }
            this.texture_buffer_init(gl);

            this.init_ok = true;
        }

        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }


        let sun_y = this.sun_y;
        this.sun_y = Math.abs(20 * Math.sin(t/3 + Math.PI/2));
        let sun_x = this.sun_x;
        this.sun_x = 35 * Math.sin(t/3);
        if (this.isDay) {
            this.light_position = vec4(35 * Math.sin(12/3), Math.abs(20 * Math.sin(12/3 + Math.PI/2)), -45, 1);
        }
        else if (this.isAfternoon) {
            this.light_position = vec4(35 * Math.sin(9/3), Math.abs(20 * Math.sin(9/3 + Math.PI/2)), -45, 1);
        }
        else if (this.isNight) {
            this.light_position = vec4(35 * Math.sin(6/3), Math.abs(20 * Math.sin(6/3 + Math.PI/2)), -45, 1);
        }
        else {
            this.light_position = vec4(this.sun_x, this.sun_y, -45, 1);
        }
        // The color of the light
        this.light_color = color(
            0.667 + Math.sin(t/500) / 3,
            0.667 + Math.sin(t/1500) / 3,
            0.667 + Math.sin(t/3500) / 3,
            1
        );

        this.light_view_target = vec4(0, 0, 0, 1);
        this.light_field_of_view = 130 * Math.PI / 180; // 130 degree

        program_state.lights = [new Light(this.light_position, this.light_color, 1000)];

        // camera positions
        if (this.attached)
        {
            if (this.attached() === this.initial_camera_location)
            {
                let desired1 = this.initial_camera_location.map((x,i) => Vector.from(program_state.camera_inverse[i]).mix(x, 0.1));
                program_state.set_camera(desired1);
            }
            else
            {
                let desired = Mat4.inverse(this.attached().times(Mat4.translation(0,1.5,7)));
                desired = desired.map((x,i) => Vector.from(program_state.camera_inverse[i]).mix(x, 0.1));
                program_state.set_camera(desired);
            }
        }

        // Step 1: set the perspective and camera to the POV of light
        const light_view_mat = Mat4.look_at(
            vec3(this.light_position[0], this.light_position[1], this.light_position[2]),
            vec3(this.light_view_target[0], this.light_view_target[1], this.light_view_target[2]),
            vec3(1, 0, 0), // assume the light to target will have a up dir of +y, maybe need to change according to your case
        );
        const light_proj_mat = Mat4.perspective(this.light_field_of_view, 1, 0.5, 500);
        // Bind the Depth Texture Buffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightDepthFramebuffer);
        gl.viewport(0, 0, this.lightDepthTextureSize, this.lightDepthTextureSize);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // Prepare uniforms
        program_state.light_view_mat = light_view_mat;
        program_state.light_proj_mat = light_proj_mat;
        program_state.light_tex_mat = light_proj_mat;
        program_state.view_mat = light_view_mat;
        program_state.projection_transform = light_proj_mat;
        this.render_scene(context, program_state, false,false, false);

        // Step 2: unbind, draw to the canvas
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        program_state.view_mat = program_state.camera_inverse;
        program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, 0.5, 500);
        this.render_scene(context, program_state, true,true, true);


        // Step 3: display the textures
        this.shapes.square_2d.draw(context, program_state,
            Mat4.translation(-.99, .08, 0).times(
                Mat4.scale(0.5, 0.5 * gl.canvas.width / gl.canvas.height, 1)
            ),
            this.depth_tex.override({texture: this.lightDepthTexture})
        );
    }
}

class Texture_Scroll_X extends Textured_Phong {
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            
            void main(){
                // Sample the texture image in the correct place:
                vec4 tex_color_coord = vec4(f_tex_coord, 0.0, 1.0);
                vec2 tex_color_coord2 = vec2(tex_color_coord.x, tex_color_coord.y + mod(-2.*animation_time, 1.0));

                vec4 tex_color = texture2D( texture, tex_color_coord2);
                
                if( tex_color.w < .01 ) discard;
                                                                         // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
}