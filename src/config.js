export const CONFIG_KEYS = {
    RAYS_NUM: "optics_simulator_rays_num",
    RAYS_ANGLE: "optics_simulator_rays_angle",
    SAMPLE_RI: "optics_simulator_sample_ri",
    PRISM_RI: "optics_simulator_prism_ri",
    LIGHT_POS: "optics_simulator_light_pos",
};

export function getConfigParameter(key, defaultValue) {
    return localStorage.getItem(key) || defaultValue;
}

export function setConfigParameter(key, value) {
    localStorage.setItem(key, value);
}
