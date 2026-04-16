import * as defaultConfigJson from '../config.json';

export class Configuration {
  nodes!: {
    // default fill colour of a node body
    background_color: string;
    // default colour of the node border/stroke
    border_color: string;
    // default colour of the node label text
    label_color: string;
    // default colour of the secondary description text below the label
    description_color: string;
    // default font size of the node label, in pixels
    label_font_size: number;
    // default font size of the node description text, in pixels
    description_font_size: number;
    // baseline multiplier (100 = 100%) used to resolve edge label font sizes from a percentage
    font_size_percent_default: number;
    // default width of rectangular and wide nodes, in pixels
    default_width: number;
    // default height of rectangular and wide nodes, in pixels
    default_height: number;
    // default width and height of squarish nodes (Square, Circle, Diamond, polygons), in pixels
    squarish_size: number;
    // minimum width any node can be resized to, in pixels
    min_width: number;
    // minimum height any node can be resized to, in pixels
    min_height: number;
    // minimum size squarish nodes can be resized to, in pixels
    min_squarish_size: number;
    // width of the node border stroke, in pixels
    border_width: number;
    // default width of the embedded image/icon inside a node, in pixels
    image_width: number;
    // default height of the embedded image/icon inside a node, in pixels
    image_height: number;
    // width-to-height ratio applied when scaling polygon shapes proportionally
    aspect_ratio: number;
    // additional scale factor applied to triangle nodes to compensate for their visual weight
    triangle_scale: number;
  };
  edges!: {
    // default colour of the edge line
    line_color: string;
    // default colour of the edge label text
    label_color: string;
    // background colour of the label pill rendered behind edge label text
    label_background_color: string;
    // opacity of the label pill background (0–1)
    label_background_opacity: number;
    // default font size of the edge label, in pixels (scaled by nodes.font_size_percent_default)
    label_font_size: number;
    // default stroke width of the edge line, in pixels
    line_width: number;
  };
  diagram!: {
    // colour of the dot grid pattern on the canvas background
    grid_dot_color: string;
    // colour of the divider lines between the sidebar and canvas panels
    divider_color: string;
    // colour of the selection highlight ring drawn around the active node or edge
    accent_color: string;
    // radius of each connection port circle on a node, in pixels
    port_radius: number;
    // stroke width of each connection port circle, in pixels
    port_stroke_width: number;
    // inner padding between a node's border and its label/image content, in pixels
    node_padding: number;
    // gap between the embedded image and the label text within a node, in pixels
    image_spacing: number;
    // x and y offset applied when duplicating a node, in pixels
    duplicate_offset: number;
    // extra space added around the selected item when drawing the selection highlight, in pixels
    selection_padding: number;
    // stroke width of the selection highlight ring, in pixels
    selection_stroke_width: number;
    // distance from a click to an edge at which the edge is considered clicked and can be removed, in pixels
    edge_remove_distance: number;
    // padding used by the manhattan (elbow) router to keep edge segments away from node boundaries, in pixels
    edge_elbow_padding: number;
    // radius within which a dragged edge endpoint snaps to the nearest port, in pixels
    snap_radius: number;
    // clearance the manhattan router maintains between routed edge segments and nearby nodes, in pixels
    router_padding: number;
    // maximum number of iterations the manhattan router runs before giving up and drawing a straight segment
    router_max_iter: number;
    // maximum number of candidate positions checked when spiralling outward to find a free drop slot for a new node
    spiral_search_limit: number;
  };
  zoom!: {
    // minimum allowed zoom scale (e.g. 0.1 = 10%)
    min: number;
    // maximum allowed zoom scale (e.g. 10 = 1000%)
    max: number;
    // scale multiplier applied on each zoom-in step
    in_factor: number;
    // scale multiplier applied on each zoom-out step
    out_factor: number;
    // minimum scale used when fitting the diagram to the viewport
    fit_min_scale: number;
    // maximum scale used when fitting the diagram to the viewport
    fit_max_scale: number;
    // padding in pixels left around the content when fitting to the viewport
    fit_padding: number;
    // fraction of the scroll delta applied per mouse-wheel tick when zooming
    wheel_sensitivity: number;
  };
  timing!: {
    // interval in ms at which the canvas is resized during a sidebar open/close animation
    sidebar_resize_interval: number;
    // duration in ms of the sidebar open/close CSS transition
    sidebar_anim_duration: number;
    // delay in ms before revoking a blob URL after a diagram export download
    blob_url_revoke_delay: number;
  };

  constructor(config?: Partial<Configuration>) {
    Object.assign(this, defaultConfigJson);

    if (config) {
      for (const key in config) {
        Object.assign((this as any)[key], (config as any)[key]);
      }
    }
  }
}

export const defaultConfig = new Configuration();
