import {LitElement, html} from "lit-element";
import Static from "../static";

/**
 * Widget used to select frontend components or microservices which should be added to the application mashup.
 * This LitElement is part of the Application View.
 * Depending on whether the attribute/property "componentType" is set to "frontend" or "microservice",
 * it lists the frontend components or microservices of the project.
 */
export class ComponentSelectWidget extends LitElement {
  render() {
    return html`

      <!-- Bootstrap stylesheet import -->
      <link href="https://netdna.bootstrapcdn.com/bootstrap/3.3.1/css/bootstrap.min.css" rel="stylesheet" id="bootstrap-css">
      
      <style>
        :host {
          font-family: Roboto;
        }
        #componentTable tr:hover {
          background-color: #ccc;
        }
        #main-content {
          width:100%;
        }
      </style>
      
      <!-- Container for actual page content -->
      <div id="main-content">
        <table class="table table-striped">
          <tbody id="componentTable">
          </tbody>
        </table>
      </div>
    `;
  }

  static get properties() {
    return {
      client: {
        type: Object
      },
      componentType: {
        type: String
      }
    };
  }

  constructor() {
    super();

    this.requestUpdate().then(_ => {
      const iwcCallback = function(intent) {
        console.log(intent);
      };

      this.client = new Las2peerWidgetLibrary(Static.ProjectManagementServiceURL + "/projects", iwcCallback, '*');

      this.getServices();
    });
  }

  createNode(name, versionedModelId, selectedTag) {
    const time = new Date().getTime();

    let data;
    if(this.componentType == "frontend") {
      data = JSON.stringify({
        selectedToolName: "Frontend Component",
        name: name,
        defaultAttributeValues: {
          "93641f72fb49c4f74264a781": versionedModelId,
          "93641f72fb49c4f74264a782": selectedTag,
        }
      });
    } else {
      data = JSON.stringify({
        selectedToolName: "Microservice",
        name: name,
        defaultAttributeValues: {
          "6a4e681cd6b9d6b21e765c46": versionedModelId,
          "6a4e681cd6b9d6b21e765c47": selectedTag,
        }
      });
    }

    const senderWidgetName = this.componentType == "frontend" ? "FRONTEND_COMPONENT_SELECT_WIDGET" : "MICROSERVICE_SELECT_WIDGET";

    const intent = new IWC.Intent(senderWidgetName, "Canvas", "ACTION_DATA", data, false);
    intent.extras = {"payload":{"data":{"data":data,"type":"ToolSelectOperation"}, "sender":null, "type":"NonOTOperation"}, "time":time};
    this.client.iwcClient.publish(intent);
  }

  /**
   *
   * Calls the project-management service first for a list of components,
   * then retrieves all components and adds all frontend components
   * to the frontend component table.
   *
   */
  getServices() {
    const modelingInfo = JSON.parse(localStorage.getItem("modelingInfo"));
    const currentProjectId = modelingInfo.application.projectId;

    this.client.sendRequest("GET", currentProjectId + "/components", "", "application/json", {}, false, function(data, type) {
      const projectComponents = JSON.parse(data);
      const componentsByType = projectComponents.filter(c => c.type == this.componentType);

      for(const component of componentsByType) {
        // add table rows
        const name = component.name;
        const version = "TODO";
        const versionedModelId = component.versionedModelId;
        this.getVersionTagsByVersionedModel(versionedModelId).then(versionTags => {
          const row = document.createElement("tr");
          row.style = "display: flex";

          /*
           * NAME
           */
          const tdName = document.createElement("td");
          tdName.style = "flex: 1; display: flex";

          const pName = document.createElement("p");
          pName.innerText = name;
          pName.style = "margin-top: auto; margin-bottom: auto";

          tdName.appendChild(pName);

          /*
           * VERSION
           */
          const tdVersion = document.createElement("td");
          tdVersion.style = "padding: 0; margin-left: auto; margin-right: 0.5em";

          const paperDropdownMenu = document.createElement("paper-dropdown-menu");
          paperDropdownMenu.setAttribute("label", "Select Version");
          paperDropdownMenu.style = "width: 5em";

          const paperListbox = document.createElement("paper-listbox");
          paperListbox.setAttribute("slot", "dropdown-content");
          paperListbox.setAttribute("selected", "0");

          const latest = document.createElement("paper-item");
          const latestVersionValue = "Latest";
          latest.innerText = latestVersionValue;
          paperListbox.appendChild(latest);

          for(const versionTag of versionTags) {
            const item = document.createElement("paper-item");
            item.innerText = versionTag;
            paperListbox.appendChild(item);
          }

          paperDropdownMenu.appendChild(paperListbox);

          tdVersion.appendChild(paperDropdownMenu);

          row.appendChild(tdName);
          row.appendChild(tdVersion);

          // make row "clickable"
          row.addEventListener("click", function() {
            let selected = paperListbox.selected;
            let selectedTag;
            if(selected == 0) {
              // Version Tag "Latest" got selected
              selectedTag = latestVersionValue;
            } else {
              // the selected version tag is element of the versionTags array
              selected--;
              selectedTag = versionTags[selected];
            }
            this.createNode(name, "" + versionedModelId, selectedTag);
          }.bind(this));

          this.getTable().appendChild(row);
        });
      }
    }.bind(this), function(error) {
      console.log(error);
    });
  };

  getVersionTagsByVersionedModel(versionedModelId) {
    return new Promise((resolve, reject) => {
      fetch(Static.ModelPersistenceServiceURL + "/versionedModels/" + versionedModelId, {
        method: "GET"
      }).then(response => {
        if(response.ok) {
          response.json().then(data => {
            const versionTags = [];
            // start with i = 1, otherwise the commit for "uncommited changes" is included
            for(let i = 1; i < data.commits.length; i++) {
              const commit = data.commits[i];
              if(commit.versionTag) versionTags.push(commit.versionTag);
            }
            resolve(versionTags);
          });
        } else {
          reject();
        }
      });
    });
  }

  getTable() {
    return this.shadowRoot.getElementById("componentTable");
  }
}

customElements.define('component-select-widget', ComponentSelectWidget);
