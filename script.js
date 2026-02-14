// Section Navigation
function showSection(sectionId) {
    const sections = document.querySelectorAll("section");
    sections.forEach(section => {
        section.classList.remove("active");
    });

    document.getElementById(sectionId).classList.add("active");
}

// Stress Calculator
function calculateStress() {
    let force = parseFloat(document.getElementById("force").value);
    let area = parseFloat(document.getElementById("area").value);

    if (force > 0 && area > 0) {
        let stress = force / area;
        document.getElementById("stressResult").innerText =
            "Stress = " + stress.toFixed(2) + " Pa";
    } else {
        document.getElementById("stressResult").innerText =
            "Please enter valid values";
    }
}

// Length Converter
function convertLength() {
    let mm = parseFloat(document.getElementById("mm").value);

    if (mm >= 0) {
        let meter = mm / 1000;
        document.getElementById("convertResult").innerText =
            "Meters = " + meter + " m";
    } else {
        document.getElementById("convertResult").innerText =
            "Enter valid number";
    }
}
