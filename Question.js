class Question {
    constructor(data) {
        this.data = data;
        this.done = false; // is the question complete?
    }

    complete() {
        this.HTML.input.root.setAttribute("hidden", "");
        this.HTML.hint.className = "correct";
        this.HTML.hint.innerText = this.data.answers.join(", ");
        this.HTML.hint.removeAttribute("hidden");
        this.done = true;

        // all questions complete
        if (questions.reduce((a, b) => a && b.done, true)) {
            let incorrect_guesses = questions.reduce((a, b) => a + b.input.wrong.length, 0);
            let p = document.createElement("p");
            p.className = "done";
            p.innerText = `Incorrect guesses: ${incorrect_guesses}`;
            if (incorrect_guesses > 0) {
                p.className = "wrong";
            } else {
                p.className = "correct";
            }
            document.querySelector("#questions").appendChild(p);
        }
    }

    // () => HTMLDivElement
    generateHTML() {
        // Create root
        this.HTML = {};
        this.HTML.root = document.createElement("div");
        this.HTML.root.className = "question";

        if (this.data.type === "arabic-keyboard-single") {
            return this.generateSingleQuestion();
        } else {
            console.error(`${this.data.type} is not supported!`);
            this.HTML.prompt = document.createElement("p");
            this.HTML.prompt.appendChild(document.createTextNode(`Question type ${this.data.type} not supported`));
            this.HTML.root.appendChild(this.HTML.prompt);
            return this.HTML.root;
        }
    }

    updateHint(overSelecting=false) {
        let answersLeft = this.data.answers.length - this.input.correct.length;
        if (overSelecting) {
            this.HTML.hint.innerText = `You cannot select more than ${answersLeft} answers`;
            return;
        }

        if (answersLeft === 1) {
            this.HTML.hint.innerText = "There is one answer left";
        } else {
            this.HTML.hint.innerText = `There are ${answersLeft} answers left`;
        }
    }

    // temporary name
    generateSingleQuestion() {
        // Create prompt
        this.HTML.prompt = document.createElement("p");
        let promptNode = document.createTextNode(this.data.prompt);
        this.HTML.prompt.appendChild(promptNode);
        this.HTML.root.appendChild(this.HTML.prompt);

        // Create feedback
        this.HTML.feedback = document.createElement("span");
        this.HTML.feedback.className = "feedback";
        this.HTML.prompt.appendChild(this.HTML.feedback);

        // Create hint
        this.HTML.hint = document.createElement("p");
        this.HTML.hint.className = "hint";
        this.hint = {};
        this.HTML.root.appendChild(this.HTML.hint);

        // Create keyboard
        this.generateKeyboard();

        // I placed the code here since updateHint depends on this.input
        if (this.data.hint) {
            this.HTML.hint.innerText = this.data.hint;
        } else {
            this.updateHint();
        }
        return this.HTML.root;
    }

    // Grades is an array like: [{correct: false, entry: 'a'}]
    updateFeedback(grades=null) {
        const OVERRIDE_LTR = "\u202D";
        this.HTML.feedback.innerHTML = "";
        if (!grades) {
            this.HTML.feedback.innerHTML = 
                `<span class="regular">${OVERRIDE_LTR}${this.input.activeKeys.map(k => k.innerText).join(", ")}</span>`;
        } else {
            for (let i = 0; i < grades.length; ++i) {
                let g = grades[i];
                this.HTML.feedback.innerHTML += `<span class="${g.correct ? "correct" : "wrong"}">${OVERRIDE_LTR}${g.entry}`;
                if (i !== grades.length - 1) {
                    this.HTML.feedback.innerHTML += ",";
                }
                this.HTML.feedback.innerHTML += "</span>";
            }
        }
    }

    generateKeyboard() {
        const keyboard_click = function(e) {
            const q = this.question;
            if (q.input.grayed.indexOf(e.target) !== -1 ||
                q.input.wrong.indexOf(e.target) !== -1 ||
                q.input.correct.indexOf(e.target) !== -1) {
                return;
            }

            q.updateHint();
            if (!q.input.activeKeys)
                q.input.activeKeys = [];

            if (!e.ctrlKey) {
                q.input.activeKeys.forEach(k => k.removeAttribute("active"));
                q.input.activeKeys = [e.target];
                e.target.setAttribute("active", "");
            } else {
                let index = q.input.activeKeys.indexOf(e.target);
                if (index === -1) {
                    let answersLeft = q.data.answers.length - q.input.correct.length;
                    if (q.input.activeKeys.length === answersLeft) {
                        q.updateHint(`You can't select more than ${answersLeft}`);
                    } else {
                        e.target.setAttribute("active", "");
                        q.input.activeKeys.push(e.target);
                    }
                }
                else {
                    q.input.activeKeys.splice(index, 1)[0].removeAttribute("active");
                }
            }

            q.updateFeedback();

            if (q.input.activeKeys.length > 0) {
                q.HTML.input.submitBtn.removeAttribute("disabled");
            } else {
                q.HTML.input.submitBtn.setAttribute("disabled", "");
            }
        };

        const submit = function(e) {
            const q = this.question;
            q.HTML.input.submitBtn.setAttribute("disabled", "");
            // Check the answer
            let entries = [];
            for (let entry of q.input.activeKeys) {
                // Wrong answer
                if (q.data.answers.indexOf(entry.innerText) === -1) {
                    entries.push({correct: false, entry: entry.innerText});
                    q.input.wrong.push(entry);
                    entry.setAttribute("wrong", "");
                } else {
                    entries.push({correct: true, entry: entry.innerText});
                    q.input.correct.push(entry);
                    entry.setAttribute("correct", "");
                }
            }

            q.updateFeedback(entries);

            // Remove the activekey
            q.input.guesses.push(...entries);
            q.input.activeKeys.forEach(k => k.removeAttribute("active"));
            q.input.activeKeys = [];
            q.updateHint();

            // If the question is complete:
            if (q.input.correct.length === q.data.answers.length) {
                q.complete();
            }
        };

        function createButtons(chars, row, q) {
            for (let char of chars) {
                const button = document.createElement("div");
                button.className = "arabic-keyboard-btn";
                button.question = q;
                const node = document.createTextNode(char);
                button.appendChild(node);
                button.addEventListener("click", keyboard_click);
                row.appendChild(button);
            }
        }

        console.warn("Keyboard only accepts one letter per submission!!");
        this.input = {};
        this.HTML.input = {};
        this.HTML.input.root = document.createElement("div");
        this.HTML.input.root.className = "arabic-keyboard";
        this.input.activeKeys = undefined;
        this.input.grayed = [];
        this.input.correct = [];
        this.input.wrong = [];
        this.input.guesses = [];

        this.HTML.input.svowelRow = document.createElement("div");
        this.HTML.input.topRow = document.createElement("div");
        this.HTML.input.middleRow = document.createElement("div");
        this.HTML.input.bottomRow = document.createElement("div");
        
        let svowelRowChars = [];
        if (this.data.input.single) {
            svowelRowChars.push(svowel.DAMMA, svowel.FATHA,
            svowel.KASRA, svowel.SUKOON);
        }
        if (this.data.input.double) {
            svowelRowChars.push(svowel.DAMMATAN, svowel.FATHATAN, svowel.KASRATAN);
        }

        const topRowChars = ["ض", "ص", "ث", "ق", "ف",
            "غ", "ع", "ه", "خ", "ح", "ج", "د"];
        const middleRowChars = ["ذ", "ش", "س", "ي", "ب",
            "ل","ا","ت","ن","م","ك","ط"];
        const bottomRowChars = ["ئ", "ء", "ؤ", "ر", "ﻻ", "ى",
            "ة", "و", "ز", "ظ"];

        createButtons(svowelRowChars, this.HTML.input.svowelRow, this);
        if (this.data.input.letters) {
            createButtons(topRowChars, this.HTML.input.topRow, this);
            createButtons(middleRowChars, this.HTML.input.middleRow, this);
            createButtons(bottomRowChars, this.HTML.input.bottomRow, this);            
        }

        let submitNode = document.createTextNode("➡");
        let submitDiv = document.createElement("div");
        submitDiv.question = this;
        submitDiv.className = "arabic-keyboard-btn submit-btn";
        submitDiv.appendChild(submitNode);
        submitDiv.addEventListener("click", submit);
        submitDiv.setAttribute("disabled", "");
        this.HTML.input.submitBtn = submitDiv;
        this.HTML.input.bottomRow.appendChild(submitDiv);

        this.HTML.input.root.appendChild(this.HTML.input.svowelRow);
        this.HTML.input.root.appendChild(this.HTML.input.topRow);
        this.HTML.input.root.appendChild(this.HTML.input.middleRow);
        this.HTML.input.root.appendChild(this.HTML.input.bottomRow);
        this.HTML.root.appendChild(this.HTML.input.root);
    }
}