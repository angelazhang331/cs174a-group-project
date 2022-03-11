import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture,
} = tiny;

const {Cube, Textured_Phong} = defs

export const LIGHT_DEPTH_TEX_SIZE = 2048;

const Square =
    class Square extends tiny.Vertex_Buffer {
        constructor() {
            super("position", "normal", "texture_coord");
            this.arrays.position = [
                vec3(0, 0, 0), vec3(1, 0 ,0), vec3(0, 1, 0),
                vec3(1, 1, 0), vec3(1, 0, 0), vec3(0, 1, 0)
            ];
            this.arrays.normal = [
                vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1),
                vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1),
            ];
            this.arrays.texture_coord = [
                vec(0, 0), vec(1, 0), vec(0, 1),
                vec(1, 1), vec(1, 0), vec(0, 1)
            ];
        }
    }

export class Assignment3 extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        this.hover = this.swarm = false;
        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            torus: new defs.Torus(15, 15),
            torus2: new defs.Torus(3, 15),
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
            ground_p: new Material(new defs.Textured_Phong(), {
                color: hex_color("#000000"),
                specularity: 1,
                ambient: 1,
                texture: new Texture("assets/grasstxt.jpeg", "NEAREST")}),
            ground_s: new Material(new Shadow_Textured_Phong_Shader(), {
                color: hex_color("#000000"),
                specularity: 1,
                ambient: 1,
                texture: new Texture("assets/grasstxt.jpeg", "NEAREST")}),
            building_material: new Material(new defs.Textured_Phong(), {
                ambient: 1,
                specularity: 1,
                color: hex_color("#000000"),
                texture: new Texture("assets/brks.jpg", "NEAREST")}),
            building_material2: new Material(new defs.Textured_Phong(), {
                ambient: 1,
                specularity: 1,
                color: hex_color("#1e1c1c"),
                texture: new Texture("assets/brks.jpg", "NEAREST")}),
            plant_material: new Material(new defs.Textured_Phong(), {
                ambient: 1,
                specularity: 1,
                color: hex_color("#1e1c1c"),
                texture: new Texture("assets/roses_edit.jpg", "NEAREST")}),
            dirt_s: new Material(new Shadow_Textured_Phong_Shader(), {
                ambient: 1,
                specularity: 1,
                color: hex_color("#000000"),
                texture: new Texture("assets/dirt_resized.jpeg", "NEAREST")}),
            dirt_p: new Material(new defs.Textured_Phong(), {
                ambient: 1,
                specularity: 1,
                color: hex_color("#000000"),
                texture: new Texture("assets/dirt_resized.jpeg", "NEAREST")}),
            light_source: new Material(new defs.Phong_Shader(), {
                color: hex_color("#edb0ff"),
                ambient: 1,
                diffusivity: 0,
                specularity: 0}),
            depth_tex: new Material(new Depth_Texture_Shader_2D(), {
                color: hex_color("#000000"),
                ambient: 1,
                diffusivity: 0,
                specularity: 0})
        }

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
        // this.light_depth_texture = new Buffered_Texture(this.lightDepthTexture);
        // this.stars.light_depth_texture = this.light_depth_texture
        // this.floor.light_depth_texture = this.light_depth_texture

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

        // sun path parametric equations
        let sun_y = Math.abs(20 * Math.sin(t/3 + Math.PI/2));
        let sun_x = 35 * Math.sin(t/3);

        let light_position = this.light_position;
        this.light_position = vec4(sun_x, sun_y, -45, 1);
        this.light_color = color(
            1.667 + Math.sin(t/500) / 3,
            1.667 + Math.sin(t/1500) / 3,
            0.667 + Math.sin(t/3500) / 3,
            1
        );

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;

        // start replacement
        program_state.draw_shadow = draw_shadow;

        if (draw_light_source && shadow_pass) {
            let draw_transform = Mat4.identity();
            draw_transform = draw_transform.times(Mat4.translation(light_position[0], light_position[1], light_position[2]))
                .times(Mat4.scale(.5,.5,.5));
            this.shapes.sphere.draw(context, program_state, draw_transform, this.light_source.override({color: this.light_color}));
        }

        // ground or grass
        let ground_transform = Mat4.identity();
        ground_transform = ground_transform.times(Mat4.translation(0,-4,0))
            .times(Mat4.rotation(Math.PI/2, 1, 0, 0))
            .times(Mat4.scale(30,30,100));
        this.shapes.square.draw(context, program_state, ground_transform, shadow_pass? this.materials.ground_s : this.materials.ground_p);

        // path on the ground
        let path_transform = Mat4.identity();
        path_transform = path_transform.times(Mat4.translation(0,-3.9,0))
            .times(Mat4.rotation(Math.PI/2, 1, 0, 0))
            .times(Mat4.scale(4, 14, 0));
        this.shapes.square2.draw(context, program_state, path_transform, shadow_pass? this.materials.dirt_s : this.materials.dirt_p);

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

        const sun_color = hex_color("#fac91a");
        let model_transform_sun = Mat4.identity();
        model_transform_sun = model_transform_sun.times(Mat4.translation(sun_x, sun_y, -45))
            .times(Mat4.scale(sun_rad, sun_rad, sun_rad));
        this.shapes.sun.draw(context, program_state, model_transform_sun, this.materials.sun_material.override({color: sun_color}));

        // putting together royce
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

        //plant stuff
        const plant_rad = 0.5;

        let plant_transform = Mat4.identity();
        plant_transform = plant_transform.times(Mat4.translation(-10,-3.5,2)).times(Mat4.rotation(Math.PI/2, 1, 0, 0))
            .times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.materials.plant_material);
        let plant_transform2 = Mat4.identity();
        plant_transform = plant_transform2.times(Mat4.translation(-9.5,-3.5,1.5)).times(Mat4.scale(1.7*plant_rad,1.7*plant_rad,1.7*plant_rad));
        this.plant_1 = plant_transform;
        this.shapes.plant.draw(context, program_state, plant_transform, this.materials.plant_material);
        let plant_transform3 = Mat4.identity();
        plant_transform = plant_transform3.times(Mat4.translation(-8.7,-3.5,2.1)).times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.materials.plant_material);

        plant_transform = Mat4.identity();
        plant_transform = plant_transform.times(Mat4.translation(7,-3.5,2)).times(Mat4.rotation(Math.PI/2, 1, 0, 0))
            .times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.materials.plant_material);
        plant_transform2 = Mat4.identity();
        plant_transform = plant_transform2.times(Mat4.translation(6.5,-3.5,1.5)).times(Mat4.scale(1.7*plant_rad,1.7*plant_rad,1.7*plant_rad));
        this.plant_2 = plant_transform;
        this.shapes.plant.draw(context, program_state, plant_transform, this.materials.plant_material);
        plant_transform3 = Mat4.identity();
        plant_transform = plant_transform3.times(Mat4.translation(5.7,-3.5,2.1)).times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.materials.plant_material);

        plant_transform = Mat4.identity();
        plant_transform = plant_transform.times(Mat4.translation(10,-3.5,10)).times(Mat4.rotation(Math.PI/2, 1, 0, 0))
            .times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.materials.plant_material);
        plant_transform2 = Mat4.identity();
        plant_transform = plant_transform2.times(Mat4.translation(9.5,-3.5,9.5)).times(Mat4.scale(1.7*plant_rad,1.7*plant_rad,1.7*plant_rad));
        this.plant_3 = plant_transform;
        this.shapes.plant.draw(context, program_state, plant_transform, this.materials.plant_material);
        plant_transform3 = Mat4.identity();
        plant_transform = plant_transform3.times(Mat4.translation(8.7,-3.5,10.1)).times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.materials.plant_material);

        plant_transform = Mat4.identity();
        plant_transform = plant_transform.times(Mat4.translation(13.8,-3.5,-4)).times(Mat4.rotation(Math.PI/2, 1, 0, 0))
            .times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.materials.plant_material);
        plant_transform2 = Mat4.identity();
        plant_transform = plant_transform2.times(Mat4.translation(14.5,-3.5,-4.5)).times(Mat4.scale(1.7*plant_rad,1.7*plant_rad,1.7*plant_rad));
        this.plant_4 = plant_transform;
        this.shapes.plant.draw(context, program_state, plant_transform, this.materials.plant_material);
        plant_transform3 = Mat4.identity();
        plant_transform = plant_transform3.times(Mat4.translation(15.3,-3.5,-5.1)).times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.materials.plant_material);

        plant_transform = Mat4.identity();
        plant_transform = plant_transform.times(Mat4.translation(-13.8,-3.5,-4)).times(Mat4.rotation(Math.PI/2, 1, 0, 0))
            .times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.materials.plant_material);
        plant_transform2 = Mat4.identity();
        plant_transform = plant_transform2.times(Mat4.translation(-14.5,-3.5,-4.5)).times(Mat4.scale(1.7*plant_rad,1.7*plant_rad,1.7*plant_rad));
        this.plant_5 = plant_transform;
        this.shapes.plant.draw(context, program_state, plant_transform, this.materials.plant_material);
        plant_transform3 = Mat4.identity();
        plant_transform = plant_transform3.times(Mat4.translation(-15.3,-3.5,-5.1)).times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.materials.plant_material);

        plant_transform = Mat4.identity();
        plant_transform = plant_transform.times(Mat4.translation(-10,-3.5,-7)).times(Mat4.rotation(Math.PI/2, 1, 0, 0))
            .times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.materials.plant_material);
        plant_transform2 = Mat4.identity();
        plant_transform = plant_transform2.times(Mat4.translation(-9.5,-3.5,-6.5)).times(Mat4.scale(1.7*plant_rad,1.7*plant_rad,1.7*plant_rad));
        this.plant_6 = plant_transform;
        this.shapes.plant.draw(context, program_state, plant_transform, this.materials.plant_material);
        plant_transform3 = Mat4.identity();
        plant_transform = plant_transform3.times(Mat4.translation(-8.7,-3.5,-5.9)).times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.materials.plant_material);

        plant_transform = Mat4.identity();
        plant_transform = plant_transform.times(Mat4.translation(-15,-3.5,7)).times(Mat4.rotation(Math.PI/2, 1, 0, 0))
            .times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.materials.plant_material);
        plant_transform2 = Mat4.identity();
        plant_transform = plant_transform2.times(Mat4.translation(-14.5,-3.5,6.5)).times(Mat4.scale(1.7*plant_rad,1.7*plant_rad,1.7*plant_rad));
        this.plant_7 = plant_transform;
        this.shapes.plant.draw(context, program_state, plant_transform, this.materials.plant_material);
        plant_transform3 = Mat4.identity();
        plant_transform = plant_transform3.times(Mat4.translation(-13.7,-3.5,5.9)).times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.materials.plant_material);

        plant_transform = Mat4.identity();
        plant_transform = plant_transform.times(Mat4.translation(15,-3.5,7)).times(Mat4.rotation(Math.PI/2, 1, 0, 0))
            .times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.materials.plant_material);
        plant_transform2 = Mat4.identity();
        plant_transform = plant_transform2.times(Mat4.translation(14.5,-3.5,6.5)).times(Mat4.scale(1.7*plant_rad,1.7*plant_rad,1.7*plant_rad));
        this.plant_8 = plant_transform;
        this.shapes.plant.draw(context, program_state, plant_transform, this.materials.plant_material);
        plant_transform3 = Mat4.identity();
        plant_transform = plant_transform3.times(Mat4.translation(13.7,-3.5,5.9)).times(Mat4.scale(plant_rad,plant_rad,plant_rad));
        this.shapes.plant.draw(context, program_state, plant_transform, this.materials.plant_material);
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
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        // STAYS IN DISPLAY
        const t = program_state.animation_time;
        const gl = context.context;

        // STAYS IN DISPLAY
        if (!this.init_ok) {
            const ext = gl.getExtension('WEBGL_depth_texture');
            if (!ext) {
                return alert('need WEBGL_depth_texture');
            }
            this.texture_buffer_init(gl);
            this.init_ok = true;
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        const light_size = this.sun_rad ** 30;
        this.light_view_target = vec4(0, 0, 0, 1);
        this.light_field_of_view = 130 * Math.PI / 180;
        program_state.lights = [new Light(this.light_position, this.light_color, light_size)];

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
        const light_view_mat = Mat4.look_at(this.light_position, this.light_view_target, vec3(0, 1, 0));
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

export class Shadow_Textured_Phong_Shader extends defs.Phong_Shader {
    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return ` precision mediump float;
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
                // ***** PHONG SHADING HAPPENS HERE: *****                                       
                vec3 phong_model_lights( vec3 N, vec3 vertex_worldspace, 
                        out vec3 light_diffuse_contribution, out vec3 light_specular_contribution ){                                        
                    // phong_model_lights():  Add up the lights' contributions.
                    vec3 E = normalize( camera_center - vertex_worldspace );
                    vec3 result = vec3( 0.0 );
                    light_diffuse_contribution = vec3( 0.0 );
                    light_specular_contribution = vec3( 0.0 );
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
                        light_diffuse_contribution += attenuation * shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse;
                        light_specular_contribution += attenuation * shape_color.xyz * specularity * specular;
                        result += attenuation * light_contribution;
                      }
                    return result;
                  } `;
    }
    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        return this.shared_glsl_code() + `
                varying vec2 f_tex_coord;
                attribute vec3 position, normal;                            
                // Position is expressed in object coordinates.
                attribute vec2 texture_coord;
                
                uniform mat4 model_transform;
                uniform mat4 projection_camera_model_transform;
        
                void main(){                                                                   
                    // The vertex's final resting place (in NDCS):
                    gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
                    // The final normal vector in screen space.
                    N = normalize( mat3( model_transform ) * normal / squared_scale);
                    vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
                    // Turn the per-vertex texture coordinate into an interpolated variable.
                    f_tex_coord = texture_coord;
                  } `;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // A fragment is a pixel that's overlapped by the current triangle.
        // Fragments affect the final image or get discarded due to depth.
        return this.shared_glsl_code() + `
                varying vec2 f_tex_coord;
                uniform sampler2D texture;
                uniform sampler2D light_depth_texture;
                uniform mat4 light_view_mat;
                uniform mat4 light_proj_mat;
                uniform float animation_time;
                uniform float light_depth_bias;
                uniform bool use_texture;
                uniform bool draw_shadow;
                uniform float light_texture_size;
                
                float PCF_shadow(vec2 center, float projected_depth) {
                    float shadow = 0.0;
                    float texel_size = 1.0 / light_texture_size;
                    for(int x = -1; x <= 1; ++x)
                    {
                        for(int y = -1; y <= 1; ++y)
                        {
                            float light_depth_value = texture2D(light_depth_texture, center + vec2(x, y) * texel_size).r; 
                            shadow += projected_depth >= light_depth_value + light_depth_bias ? 1.0 : 0.0;        
                        }    
                    }
                    shadow /= 9.0;
                    return shadow;
                }
                
                void main(){
                    // Sample the texture image in the correct place:
                    vec4 tex_color = texture2D( texture, f_tex_coord );
                    if (!use_texture)
                        tex_color = vec4(0, 0, 0, 1);
                    if( tex_color.w < .01 ) discard;
                    
                    // Compute an initial (ambient) color:
                    gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                    
                    // Compute the final color with contributions from lights:
                    vec3 diffuse, specular;
                    vec3 other_than_ambient = phong_model_lights( normalize( N ), vertex_worldspace, diffuse, specular );
                    
                    // Deal with shadow:
                    if (draw_shadow) {
                        vec4 light_tex_coord = (light_proj_mat * light_view_mat * vec4(vertex_worldspace, 1.0));
                        // convert NDCS from light's POV to light depth texture coordinates
                        light_tex_coord.xyz /= light_tex_coord.w; 
                        light_tex_coord.xyz *= 0.5;
                        light_tex_coord.xyz += 0.5;
                        float light_depth_value = texture2D( light_depth_texture, light_tex_coord.xy ).r;
                        float projected_depth = light_tex_coord.z;
                        
                        bool inRange =
                            light_tex_coord.x >= 0.0 &&
                            light_tex_coord.x <= 1.0 &&
                            light_tex_coord.y >= 0.0 &&
                            light_tex_coord.y <= 1.0;
                              
                        float shadowness = PCF_shadow(light_tex_coord.xy, projected_depth);
                        
                        if (inRange && shadowness > 0.3) {
                            diffuse *= 0.2 + 0.8 * (1.0 - shadowness);
                            specular *= 1.0 - shadowness;
                        }
                    }
                    
                    gl_FragColor.xyz += diffuse + specular;
                } `;
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
        const PCM = gpu_state.projection_transform.times(gpu_state.view_mat).times(model_transform);
        gl.uniformMatrix4fv(gpu.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        gl.uniformMatrix4fv(gpu.projection_camera_model_transform, false, Matrix.flatten_2D_to_1D(PCM.transposed()));
        // shadow related
        gl.uniformMatrix4fv(gpu.light_view_mat, false, Matrix.flatten_2D_to_1D(gpu_state.light_view_mat.transposed()));
        gl.uniformMatrix4fv(gpu.light_proj_mat, false, Matrix.flatten_2D_to_1D(gpu_state.light_proj_mat.transposed()));

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
        // update_GPU(): Add a little more to the base class's version of this method.
        super.update_GPU(context, gpu_addresses, gpu_state, model_transform, material);
        // Updated for assignment 4
        context.uniform1f(gpu_addresses.animation_time, gpu_state.animation_time / 1000);
        if (material.color_texture && material.color_texture.ready) {
            // Select texture unit 0 for the fragment shader Sampler2D uniform called "texture":
            context.uniform1i(gpu_addresses.color_texture, 0); // 0 for color texture
            // For this draw, use the texture image from correct the GPU buffer:
            context.activeTexture(context["TEXTURE" + 0]);
            material.color_texture.activate(context);
            context.uniform1i(gpu_addresses.use_texture, 1);
        }
        else {
            context.uniform1i(gpu_addresses.use_texture, 0);
        }
        if (gpu_state.draw_shadow) {
            context.uniform1i(gpu_addresses.draw_shadow, 1);
            context.uniform1f(gpu_addresses.light_depth_bias, 0.003);
            context.uniform1f(gpu_addresses.light_texture_size, LIGHT_DEPTH_TEX_SIZE);
            context.uniform1i(gpu_addresses.light_depth_texture, 1); // 1 for light-view depth texture}
            if (material.light_depth_texture && material.light_depth_texture.ready) {
                context.activeTexture(context["TEXTURE" + 1]);
                material.light_depth_texture.activate(context, 1);
            }
        }
        else {
            context.uniform1i(gpu_addresses.draw_shadow, 0);
        }
    }
}

export class Buffered_Texture extends tiny.Graphics_Card_Object {
    // **Texture** wraps a pointer to a new texture image where
    // it is stored in GPU memory, along with a new HTML image object.
    // This class initially copies the image to the GPU buffers,
    // optionally generating mip maps of it and storing them there too.
    constructor(texture_buffer_pointer) {
        super();
        Object.assign(this, {texture_buffer_pointer});
        this.ready = true;
        this.texture_buffer_pointer = texture_buffer_pointer;
    }

    copy_onto_graphics_card(context, need_initial_settings = true) {
        // copy_onto_graphics_card():  Called automatically as needed to load the
        // texture image onto one of your GPU contexts for its first time.

        // Define what this object should store in each new WebGL Context:
        const initial_gpu_representation = {texture_buffer_pointer: undefined};
        // Our object might need to register to multiple GPU contexts in the case of
        // multiple drawing areas.  If this is a new GPU context for this object,
        // copy the object to the GPU.  Otherwise, this object already has been
        // copied over, so get a pointer to the existing instance.
        const gpu_instance = super.copy_onto_graphics_card(context, initial_gpu_representation);

        if (!gpu_instance.texture_buffer_pointer) gpu_instance.texture_buffer_pointer = this.texture_buffer_pointer;

        // const gl = context;
        // gl.bindTexture(gl.TEXTURE_2D, gpu_instance.texture_buffer_pointer);
        //
        // if (need_initial_settings) {
        //     gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        //     // Always use bi-linear sampling when zoomed out.
        //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl[this.min_filter]);
        //     // Let the user to set the sampling method
        //     // when zoomed in.
        // }
        //
        // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image);
        // if (this.min_filter == "LINEAR_MIPMAP_LINEAR")
        //     gl.generateMipmap(gl.TEXTURE_2D);
        // // If the user picked tri-linear sampling (the default) then generate
        // // the necessary "mips" of the texture and store them on the GPU with it.
        return gpu_instance;
    }

    activate(context, texture_unit = 0) {
        // activate(): Selects this Texture in GPU memory so the next shape draws using it.
        // Optionally select a texture unit in case you're using a shader with many samplers.
        // Terminate draw requests until the image file is actually loaded over the network:
        if (!this.ready)
            return;
        const gpu_instance = super.activate(context);
        context.activeTexture(context["TEXTURE" + texture_unit]);
        context.bindTexture(context.TEXTURE_2D, this.texture_buffer_pointer);
    }
}

export class Depth_Texture_Shader_2D extends defs.Phong_Shader {
    // **Textured_Phong** is a Phong Shader extended to addditionally decal a
    // texture image over the drawn shape, lined up according to the texture
    // coordinates that are stored at each shape vertex.

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        return this.shared_glsl_code() + `
                varying vec2 f_tex_coord;
                attribute vec3 position, normal;                            
                // Position is expressed in object coordinates.
                attribute vec2 texture_coord;
                
                uniform mat4 model_transform;
                uniform mat4 projection_camera_model_transform;
        
                void main(){                                                                   
                    // The vertex's final resting place (in NDCS):
                    gl_Position = model_transform * vec4( position.xy, -1, 1.0 ); // <== only Model, no View
                    // The final normal vector in screen space.
                    N = normalize( mat3( model_transform ) * normal / squared_scale);
                    vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
                    // Turn the per-vertex texture coordinate into an interpolated variable.
                    f_tex_coord = texture_coord;
                  } `;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // A fragment is a pixel that's overlapped by the current triangle.
        // Fragments affect the final image or get discarded due to depth.
        return this.shared_glsl_code() + `
                varying vec2 f_tex_coord;
                uniform sampler2D texture;
                uniform float animation_time;
                
                void main(){
                    // Sample the texture image in the correct place:
                    vec4 tex_color = texture2D( texture, f_tex_coord );
                    tex_color.y = tex_color.z = tex_color.x;
                    if( tex_color.w < .01 ) discard;
                                                                             // Compute an initial (ambient) color:
                    gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                             // Compute the final color with contributions from lights:
                    gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
                  } `;
    }

    update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
        // update_GPU(): Add a little more to the base class's version of this method.
        super.update_GPU(context, gpu_addresses, gpu_state, model_transform, material);
        // Updated for assignment 4
        context.uniform1f(gpu_addresses.animation_time, gpu_state.animation_time / 1000);
        context.uniform1i(gpu_addresses.texture, 2); // 2 for light-view depth texture
        context.activeTexture(context["TEXTURE" + 2]);
        context.bindTexture(context.TEXTURE_2D, material.texture);
    }
}

