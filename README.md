<div align="center">
  <h1>WADe - MEAD (Medical Web Advisor)</h1>
  
  <p>
    MEAD is a web-based experience for high-school students to help them learn more about common conditions, different countries and how the conditions in them impact the prevalence of diseases.
  </p>

**Tags:** project, infoiasi, wade, web

</div>
<br />

<!-- Table of Contents -->

# Table of Contents

- [About the Project](#about-the-project)
  - [Tech Stack](#tech-stack)
  - [Features](#features)
- [Getting Started](#getting-started)
  - [Run Locally](#run-locally)
- [Usage](#usage)
- [Roadmap](#roadmap)
- [License](#license)
- [Acknowledgements](#acknowledgements)

<!-- About the Project -->

## About the Project

<!-- TechStack -->

### Tech Stack

<details>
  <summary>Client</summary>
  <ul>
    <li><a href="https://reactjs.org/">React.js</a></li>
    <li><a href="https://ant.design/">Ant Design</a></li>
    <li><a href="https://www.javascript.com/">JavaScript</a></li>
  </ul>
</details>

<details>
  <summary>Server</summary>
  <ul>
    <li><a href="https://nodejs.org/en">Node.js</a></li>
    <li><a href="https://expressjs.com/">Express.js</a></li>
  </ul>
</details>

<details>
<summary>Semantic Storage</summary>
  <ul>
    <li><a href="https://jena.apache.org/documentation/fuseki2/">Apache Jena Fuseki</a></li>
  </ul>
</details>

<details>
<summary>DevOps</summary>
  <ul>
    <li><a href="https://www.docker.com/">Docker</a></li>
  </ul>
</details>

<!-- Features -->

### Features

- Common Disease Information
- Countries Information
- Country-level disease risk assessment
- Explainable scoring

<!-- Getting Started -->

## Getting Started

<!-- Run Locally -->

### Run Locally

Clone the project

```bash
  git clone https://github.com/luanamihalachi/mead
```

Start Apache Jena Fuseki (Docker)

```bash
  docker compose up -d fuseki
```

Install dependencies

```bash
  npm install
```

Start the server

```bash
  npm run dev
```

Start the frontend

```bash
  cd .\frontend\
```

```bash
  npm run dev
```

<!-- Usage -->

## Usage

MEAD lets you explore disease-related risk assessments by country, using an explainable, rule-based scoring model. It also lets you get more information about conditions and countries.

1. Open the frontend in your browser (after starting the frontend dev server).
2. Select a **Country** from the Countries view.
3. Choose a **Disease/Condition** to evaluate.
4. MEAD displays:
   - a **risk level / score** for the selected disease in that country
   - an explanation of **why** that score was produced (triggered rules / factors)
5. The computed assessment is stored in **Apache Jena Fuseki** so it can be queried later via SPARQL and reused by the services.

<!-- Roadmap -->

## Roadmap

- [x] Backend microservice architecture
- [x] Risk assessment service
- [ ] Expand the diseases available in the application

<!-- License -->

## License

This project is developed for academic purposes within the WADe course.

<!-- Acknowledgments -->

## Acknowledgements

- [WADe course](https://profs.info.uaic.ro/sabin.buraga/teach/courses/wade)
- [Ant Design](https://ant.design/)
