import * as defaultConfig from '../config.json';

export class Configuration {
  colors!: {
    node_background: string;
    node_border: string;
    label: string;
    description: string;
    edge_line: string;
    edge_label: string;
    accent: string;
    grid_dot: string;
    divider: string;
    edge_label_bg: string;
    opacity_edge_label_bg: number;
  };
  node_sizes!: {
    default_width: number;
    default_height: number;
    border_width: number;
    edge_line_width: number;
    squarish_size: number;
    min_width: number;
    min_height: number;
    min_squarish_size: number;
  };
  image_dimensions!: {
    default_width: number;
    default_height: number;
  };
  font_sizes!: {
    label: number;
    description: number;
    edge_label: number;
    percent_default: number;
  };
  ui_measurements!: {
    port_radius: number;
    port_stroke_width: number;
    node_padding: number;
    image_spacing: number;
    selection_padding: number;
    selection_stroke_width: number;
    edge_remove_distance: number;
    edge_elbow_padding: number;
    snap_radius: number;
    router_padding: number;
    router_max_iter: number;
    duplicate_offset: number;
    spiral_search_limit: number;
  };
  polygon_shape_ratios!: {
    aspect_ratio: number;
    triangle_scale: number;
  };
  zoom!: {
    min: number;
    max: number;
    in_factor: number;
    out_factor: number;
    fit_min_scale: number;
    fit_max_scale: number;
    fit_padding: number;
    wheel_sensitivity: number;
  };
  timing!: {
    sidebar_resize_interval: number;
    sidebar_anim_duration: number;
    blob_url_revoke_delay: number;
  };

  constructor(config?: Partial<Configuration>) {
    Object.assign(this, defaultConfig);

    if (config) {
      for (const key in config) {
        Object.assign((this as any)[key], (config as any)[key]);
      }
    }
  }
}

export const config = new Configuration();
