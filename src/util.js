function basename(path) {
    return path.substr(path.lastIndexOf('/') + 1);
}

export default {
    basename
};
