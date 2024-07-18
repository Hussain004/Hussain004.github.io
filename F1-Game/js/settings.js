class Settings
{
    constructor(scene) {
        // reference to the game scene
        this.scene = scene;

        var font = {font: '16px Arial', fill: '#000000'};
        this.txtPause = scene.add.text(1720, 5, '', font);

        this.show();
    }

    // show all settings
    show() {
        this.txtPause.text = 'Press [P] to pause.';
    }
}