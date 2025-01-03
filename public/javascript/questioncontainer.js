export default function QuestionContainer(container, containerzes, socket) {
    // Fisher-Yates shuffle function
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1)); // Random index
            // Swap elements
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    let currentQuestion = 0;
    let score = 0; // Initialize score
    let cnt = 1;
    const answeredQuestions = new Set();  // Keep track of answered questions

    // Create initial UI
    const containerCategory = document.createElement('span');
    containerCategory.classList.add('container-category');
    containerCategory.innerText = containerzes[currentQuestion].category;
    container.appendChild(containerCategory);

    const countContainer = document.createElement('div');
    countContainer.classList.add('d-flex', 'justify-space-between');

    const qnsCount = document.createElement('span');
    qnsCount.classList.add('qns-count');
    countContainer.appendChild(qnsCount);
    let timeBar = document.createElement('div');
    timeBar.classList.add('timebar');
    timeBar.style.width = '100%';
    timeBar.style.height = '20px';
    timeBar.style.background = 'green';
    document.body.appendChild(timeBar);
    let time = 10;
    let timer = setInterval(() => {
      timeBar.style.width = `${time * 10}%`;
      timeBar.style.background = `linear-gradient(to right, green ${time * 10}%, red ${time * 10}%)`;
      time--;
      if (time === 0) {
        clearInterval(timer);
        time=10;

      }
    }, 1000);
    const scoreContainer = document.createElement('span');
    scoreContainer.classList.add('cur-score');
    countContainer.appendChild(scoreContainer);

    // Create question and options UI
    const questionParent = document.createElement('div');
    const optionsParent = document.createElement('div');
    const ctaBtns = document.createElement('div');
    ctaBtns.classList.add('cta-btns', 'd-flex', 'justify-center', 'gap', 'flex-column');

    const navigationBtns = document.createElement('div');
    navigationBtns.classList.add('d-flex', 'justify-center', 'gap');

    const prevBtn = document.createElement('button');
    prevBtn.classList.add('cta', 'prev');
    prevBtn.textContent = 'Previous';
    navigationBtns.appendChild(prevBtn);

    const nextBtn = document.createElement('button');
    nextBtn.classList.add('cta', 'next');
    nextBtn.textContent = 'Next';
    navigationBtns.appendChild(nextBtn);

    ctaBtns.appendChild(navigationBtns);

    const quitBtn = document.createElement('button');
    quitBtn.classList.add('cta', 'quit');
    quitBtn.textContent = 'Quit';
    ctaBtns.appendChild(quitBtn);

    container.appendChild(countContainer);
    container.appendChild(questionParent);
    container.appendChild(optionsParent);
    container.appendChild(ctaBtns);

    // Function to create a question and its options
    function createQuestionAndOptions() {
        const currentData = containerzes[currentQuestion];
        console.log('Current Question Data:', currentData); // Debug current data

        qnsCount.innerText = `Q${currentQuestion + 1}/${containerzes.length}`;
        scoreContainer.innerText = `Score: ${score}`;
        containerCategory.innerText = currentData.category;

        questionParent.innerHTML = `Q${currentQuestion + 1}: ${currentData.question}`;

        const options = [
            currentData.correct_answer,
            ...currentData.incorrect_answers,
        ];
        const shuffledOptions = shuffleArray(options);
        console.log('Shuffled Options:', shuffledOptions);  // Debug shuffled options

        optionsParent.innerHTML = ''; // Clear previous options

        // Create option buttons
        for (let option of shuffledOptions) {
            const optionBtn = document.createElement("button");
            optionBtn.classList.add("button", "circular-btn");
            optionBtn.setAttribute("name", option);
            optionBtn.innerText = option;

            // Disable the button if the question has been answered
            if (answeredQuestions.has(currentQuestion)) {
                optionBtn.setAttribute("disabled", true);
                if (option === currentData.correct_answer) {
                    optionBtn.classList.add("success");
                } else if (option === currentData.selected_answer) {
                    optionBtn.classList.add("error");
                }
            }

            optionsParent.appendChild(optionBtn);
        }
        updateButtonStates();
    }

    // Event listener for the Previous button
    prevBtn.addEventListener("click", () => {
        if (currentQuestion > 0) {
            currentQuestion--;
            createQuestionAndOptions();
            nextBtn.innerText = "Next";
        }
        updateButtonStates();
    });

    // Event listener for the Next button
    nextBtn.addEventListener("click", () => {
        if (nextBtn.innerText === "Next") {
            currentQuestion++;
            if (currentQuestion < containerzes.length) {
                createQuestionAndOptions();
            }
            if (currentQuestion === containerzes.length - 1) {
                nextBtn.innerText = "Submit";
            }
        } else if (nextBtn.innerText === "Submit") {
            finishQuiz();
        }
        updateButtonStates();
    });

    // Event listener for the Quit button
    quitBtn.addEventListener("click", () => {
        score = 0;
        finishQuiz();
    });

    // Event listener for options selection
    optionsParent.addEventListener("click", (e) => {
        if (e.target.classList.contains("button") && !answeredQuestions.has(currentQuestion)) {
            const selectedAnswer = e.target.getAttribute("name");
            const correctAnswer = containerzes[currentQuestion].correct_answer;

            answeredQuestions.add(currentQuestion); // Mark question as answered
            containerzes[currentQuestion].selected_answer = selectedAnswer; // Store selected answer

            if (selectedAnswer === correctAnswer) {
                e.target.classList.add("success");
                score += 5;
                scoreContainer.innerText = `Score: ${score}`;
            } else {
                e.target.classList.add("error");
                score--;
                // Highlight the correct answer
                optionsParent.querySelector(`[name="${correctAnswer}"]`).classList.add("success");
            }

            // Disable all options after selection
            optionsParent.querySelectorAll(".button").forEach(button => {
                button.setAttribute("disabled", true);
            });
        }
    });

    // Function to update button states
    function updateButtonStates() {
        prevBtn.disabled = currentQuestion === 0;
        nextBtn.disabled = currentQuestion === containerzes.length - 1 && nextBtn.innerText !== "Submit";
    }

 
}

// Function to handle score submission
async function submitScore(score) {
    try {
        const response = await fetch('/updatescore', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ score: score })
        });

        if (!response.ok) {
            throw new Error('Score submission failed');
        }

        console.log('Score submitted successfully');
    } catch (error) {
        console.error('Error submitting score:', error);
    }
}

// Function to update rank in the database
async function updateRank(rank) {
    try {
        const response = await fetch('/updaterank', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ rank: rank })
        });

        if (!response.ok) {
            throw new Error('Rank update failed');
        }

        const result = await response.json();
        console.log('Rank updated successfully:', result);
    } catch (error) {
        console.error('Error updating rank:', error);
    }
}

// Function to fetch and update user's rank
async function updateUserRank(newScore) {
    try {
        const response = await fetch('/read', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }

        const users = await response.json();
        
        // Sort users by score in descending order
        users.sort((a, b) => b.score - a.score);

        // Find the current user's email
        const currentUserEmail = await getCurrentUserEmail();

        // Update the current user's score in the local array
        const currentUserIndex = users.findIndex(user => user.userEmail === currentUserEmail);
        if (currentUserIndex !== -1) {
            users[currentUserIndex].score = newScore;
        } else {
            console.error('Current user not found in the list');
            return;
        }

        // Re-sort the array with the updated score
        users.sort((a, b) => b.score - a.score);

        // Find the current user's new position (rank)
        const userRank = users.findIndex(user => user.userEmail === currentUserEmail) + 1;

        // Update the rank in the database
        await updateRank(userRank);

        console.log('User rank updated to:', userRank);
        return userRank;
    } catch (error) {
        console.error('Error updating user rank:', error);
        return null;
    }
}

// Helper function to get current user's email
async function getCurrentUserEmail() {
    try {
        const response = await fetch('/profile', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user profile');
        }

        const userData = await response.json();
        return userData.userEmail;
    } catch (error) {
        console.error('Error fetching user email:', error);
        return null;
    }
}