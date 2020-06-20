import { LitElement, html} from 'lit-element';
import '@polymer/paper-checkbox/paper-checkbox.js';
import Common from "../common";
import Auth from "../auth";
import Static from "../static";
import ModelDifferencing from "../model-differencing/model-differencing";
import NodeAddition from "../model-differencing/node/node-addition";
import NodeDeletion from "../model-differencing/node/node-deletion";
import NodeUpdate from "../model-differencing/node/node-update";

export class CommitDetails extends LitElement {
  render() {
    return html`
      <style>
        .separator {
          border-top: thin solid #e1e1e1;
        }
        .input {
          width: 100%;
          border-radius: 3px;
          margin-right: 0.2em;
          margin-left: 0.2em;
          border: thin solid #e1e1e1;
          height: 2.5em;
          padding-left:5px;
        }
        /* Set outline to none, otherwise the border color changes when clicking on input field. */
        .input:focus {
          outline: none;
        }
        .input-version-number {
          width: 1em;
          height: 2em;
        }
        paper-button {
          color: rgb(240,248,255);
          background: rgb(30,144,255);
          height: 2.5em;
        }
        paper-button:hover {
          color: rgb(240,248,255);
          background: rgb(65,105,225);
        }
        paper-button[disabled] {
          background: #e1e1e1;
        }
      </style>
      
      <h3>Commit Details</h3>
      <div class="separator"></div>
      <!-- div for main content -->
      <div style="height: 500px; display: flex; flex-direction: column">
        <!-- div for displaying changes -->
        <div style="flex-grow: 1">
          <!-- div for selecting all changes -->
          <div style="margin-left: 1em; margin-top: 1em; margin-bottom: 1em">
            <paper-checkbox checked="true" disabled="true">Select all changes</paper-checkbox>
          </div>
          <div class="separator"></div>
          <!-- div for changes list -->
          <div id="changes-list" style="overflow: scroll; height: 400px">
            <!-- gets replaced by code -->
          </div>
        </div>
        <div class="separator"></div>
        <!-- div for commit settings -->
        <div style="margin-left: 1em; margin-top: 1em; margin-bottom: 1em; margin-right: 1em">
          <!-- div for commit version tag settings -->
          <div>
            <paper-checkbox aria-checked="false" id="new-version-checkbox" @change="${this._onNewVersionCheckBoxChanged}">New version</paper-checkbox>
            <!-- div for entering version number -->
            <div id="version-number-div" style="display: none">
              <div style="display: flex; height: 2em; margin-top: 0.5em">
                <input id="input-version-number-1" class="input input-version-number"/>
                <span style="margin-top: 0.85em">.</span>
                <input id="input-version-number-2" class="input input-version-number"/>
                <span style="margin-top: 0.85em">.</span>
                <input id="input-version-number-3" class="input input-version-number"/>
              </div>
            </div>
          </div>
          <!-- div for commit message and commit button -->
          <div style="margin-top: 0.5em">
            <input id="input-commit-message" class="input" placeholder="Enter commit message" style="margin-left: 0"
              @input="${(e) => this._onCommitMessageInputChanged(e.target.value)}"/>
            <paper-button id="button-commit" @click="${this._onCommitClicked}"
                        style="margin-top: 0.5em" disabled="true">Commit</paper-button>
          </div>
        </div>
      </div>
      
      <!-- Dialog showing a loading bar -->
      <paper-dialog id="dialog-loading" modal>
        <paper-spinner-lite active></paper-spinner-lite>
      </paper-dialog>
      
       <!-- Generic Toast (see showToast method for more information) -->
      <paper-toast id="toast" text="Will be changed later."></paper-toast>
    `;
  }

  static get properties() {
    return {
      differences: {
        type: Array
      }
    };
  }

  constructor() {
    super();
    this.differences = [];
  }

  /**
   * Gets called when the input of the commit message input field
   * gets changed.
   * @param commitMessage The currently entered commit message.
   * @private
   */
  _onCommitMessageInputChanged(commitMessage) {
    if(commitMessage) {
      // enable commit button, because commit message is not empty anymore
      this.getCommitButton().disabled = false;
    } else {
      // commit button should only be enabled when a message is entered
      // so disable commit button now, since message is empty
      this.getCommitButton().disabled = true;
    }
  }

  /**
   * Gets called when the user clicks on the "commit" button.
   * @private
   */
  _onCommitClicked() {
    console.log("_onCommitClicked() called");
    // get commit message
    const commitMessage = this.getCommitMessageInput().value;

    // disable button so that it is not possible to click the button twice (or more often)
    this.getCommitButton().disabled = true;

    // show dialog
    this.openLoadingDialog();

    const body = {
      message: commitMessage
    };

    if(this.getNewVersionCheckBox().checked) {
      body.versionTag = this.getEnteredVersion();
    }

    // get current model out of Yjs room
    Common.getModelFromYjsRoom(Common.getYjsRoomNameForVersionedModel(Common.getVersionedModelId())).then(model => {
      if(model) {
        body.model = model;

        fetch(Static.ModelPersistenceServiceURL + "/versionedModels/" + Common.getVersionedModelId() + "/commits", {
          method: "POST",
          headers: Auth.getAuthHeader(),
          body: JSON.stringify(body)
        }).then(response => {
          // close dialog
          this.closeLoadingDialog();

          // clear message input field
          this.getCommitMessageInput().value = "";

          // reset version tag input area
          this.resetVersionTagUI();

          if(response.ok) {
            // reload commit list
            this.sendReloadCommitListEvent();
          } else {
            console.log(response.status);
            if(response.status == "403") {
              this.showToast("You are not allowed to commit to this component!");
            }
          }
        });
      } else {
        console.error("Tried loading model out of Yjs room, but model is undefined.");
      }
    });
  }

  /**
   * Gets called by versioning-element after the versioned model got loaded from API.
   * @param versionedModel
   */
  setVersionedModel(versionedModel) {
    console.log("Commit-Details: Received versioned model from versioning-element.");

    const commits = versionedModel.commits;
    // get last real commit (do not take "uncommited changes" commit)
    const lastCommit = commits[1];

    // observe current model for changes
    Y({
      db: {
        name: "memory" // store the shared data in memory
      },
      connector: {
        name: "websockets-client", // use the websockets connector
        room: Common.getYjsRoomNameForVersionedModel(versionedModel.id),
        options: { resource: Static.YjsResourcePath},
        url: Static.YjsAddress
      },
      share: { // specify the shared content
        data: 'Map'
      }
    }).then(function(y) {
      y.share.data.observe(event => {
        console.log("data observer: ", event);
        const differences = ModelDifferencing.getDifferences(lastCommit.model, y.share.data.get("model"));

        console.log("differences: ", differences);

        if(differences.length > 0) {
          // there are differences since the last commit
          this.differences = differences;
          this.updateChangesListElement();
        }
      });
    }.bind(this));
  }

  updateChangesListElement() {
    const changesListElement = this.getChangesListElement();

    // clear all elements
    while (changesListElement.firstChild) changesListElement.removeChild(changesListElement.firstChild);

    // read elements
    for(let i in this.differences) {
      const difference = this.differences[i];

      changesListElement.appendChild(difference.toHTMLElement());
      changesListElement.appendChild(this.getSeparatorElement());
    }
  }

  getSeparatorElement() {
    const separator = document.createElement("div");
    separator.setAttribute("class", "separator");
    return separator;
  }

  getChangesListElement() {
    return this.shadowRoot.getElementById("changes-list");
  }

  /**
   * Notifies the versioning-element to reload the commit list.
   */
  sendReloadCommitListEvent() {
    const event = new CustomEvent("reload-commit-list");
    this.dispatchEvent(event);
  }

  /**
   * Gets called when the checked-value of the new version checkbox
   * got changed.
   * Expands/hides possibility to edit version tag.
   * @private
   */
  _onNewVersionCheckBoxChanged() {
    const checked = this.getNewVersionCheckBox().checked;

    if(checked) {
      // expand possibility to edit version tag
      this.getVersionNumberDiv().removeAttribute("style");
    } else {
      // hide possibility to edit version tag
      this.getVersionNumberDiv().style.display = "none";
    }
  }

  /**
   * Returns the HTMLElement of the commit button.
   * @returns {HTMLElement} HTMLElement of the commit button.
   */
  getCommitButton() {
    return this.shadowRoot.getElementById("button-commit");
  }

  /**
   * Returns the HTMLElement of the check box for deciding whether the commit
   * should be tagged with a new version or not.
   * @returns {HTMLElement} HTMLElement of the new version checkbox.
   */
  getNewVersionCheckBox() {
    return this.shadowRoot.getElementById("new-version-checkbox");
  }

  resetVersionTagUI() {
    // reset checkbox
    this.getNewVersionCheckBox().checked = false;

    // reset input fields
    this.getVersionNumberInput(1).value = "";
    this.getVersionNumberInput(2).value = "";
    this.getVersionNumberInput(3).value = "";

    // hide version number div
    this.getVersionNumberDiv().style.display = "none";
  }

  /**
   * Creates a semantic version number from the three input fields.
   * @returns {string}
   */
  getEnteredVersion() {
    const major = this.getVersionNumberInput(1).value;
    const minor = this.getVersionNumberInput(2).value;
    const patch = this.getVersionNumberInput(3).value;
    return major + "." + minor + "." + patch;
  }

  getVersionNumberInput(part) {
    return this.shadowRoot.getElementById("input-version-number-" + part);
  }

  /**
   * Returns the HTMLElement of the div that gets used for entering the version
   * number of a commit.
   * @returns {HTMLElement} HTMLElement of the div for entering the version number.
   */
  getVersionNumberDiv() {
    return this.shadowRoot.getElementById("version-number-div");
  }

  /**
   * Returns the HTMLElement of the input field for entering the commit message.
   * @returns {HTMLElement} HTMLElement of commit message input field.
   */
  getCommitMessageInput() {
    return this.shadowRoot.getElementById("input-commit-message");
  }

  /**
   * Opens the dialog which shows a progress spinner.
   */
  openLoadingDialog() {
    this.shadowRoot.getElementById("dialog-loading").open();
  }

  /**
   * Closes the dialog which shows a progress spinner.
   */
  closeLoadingDialog() {
    this.shadowRoot.getElementById("dialog-loading").close();
  }

  /**
   * Since the cae-static-app page uses lots of toast messages,
   * it is helpful to have this method for displaying toast messages.
   * It allows to have one single paper-toast item in the html which
   * gets used for different message texts.
   * @param text Text to display in the toast.
   */
  showToast(text) {
    const toastElement = this.shadowRoot.getElementById("toast");
    toastElement.text = text;
    toastElement.show();
  }
}

customElements.define('commit-details', CommitDetails);
