import { useState } from 'react';
import { Dialog } from '../../components/Dialog';
import { Icon, type IconName } from '../../components/Icon';
import { AREAS, TOPICS, topicsByArea, type Topic } from '../../lib/topics';

interface TopicsDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Catálogo de temas con ficha de detalle y fuente consultada. */
export function TopicsDialog({ open, onClose }: TopicsDialogProps) {
  const [selected, setSelected] = useState<Topic | null>(null);

  const close = () => {
    setSelected(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={selected ? selected.label : 'Temas'}
      description={
        selected
          ? selected.source.label
          : 'Explorá conceptos de distintas áreas. Elegí uno para ver su ficha.'
      }
      className="progressDialog topicsDialog"
    >
      {selected ? (
        <div className="topicDetail">
          <button type="button" className="textButton" onClick={() => setSelected(null)}>
            <Icon name="chevronDown" size={15} />
            Volver
          </button>
          <div className="topicDetailHead">
            <span className="topicDetailIcon" aria-hidden="true">
              <Icon name={selected.icon as IconName} size={26} />
            </span>
            <div>
              <h3>{selected.label}</h3>
              <p className="topicAreaLabel">{selected.area}</p>
            </div>
          </div>
          <section className="progressSection" aria-labelledby="topic-what">
            <h3 id="topic-what">Qué es</h3>
            <p className="topicText">{selected.what}</p>
          </section>
          <section className="progressSection" aria-labelledby="topic-how">
            <h3 id="topic-how">Cómo funciona</h3>
            <p className="topicText">{selected.how}</p>
          </section>
          <section className="progressSection" aria-labelledby="topic-example">
            <h3 id="topic-example">Un ejemplo</h3>
            <p className="topicText">{selected.example}</p>
          </section>
          <a
            className="topicSource"
            href={selected.source.url}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="info" size={15} />
            Fuente: {selected.source.label}
          </a>
        </div>
      ) : (
        <div className="topicCatalog">
          {AREAS.map((area) => (
            <section key={area.id} className="progressSection" aria-labelledby={`topic-area-${area.id}`}>
              <h3 id={`topic-area-${area.id}`}>{area.label}</h3>
              <p className="topicAreaDesc">{area.description}</p>
              <ul className="topicList">
                {topicsByArea(area.id).map((topic) => (
                  <li key={topic.id}>
                    <button
                      type="button"
                      className="topicButton"
                      onClick={() => setSelected(topic)}
                    >
                      <span className="topicButtonIcon" aria-hidden="true">
                        <Icon name={topic.icon as IconName} size={18} />
                      </span>
                      <span>{topic.label}</span>
                      <Icon name="chevronDown" size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p className="topicNote">
            {TOPICS.length} temas con fuentes verificables. Los textos son resúmenes propios.
          </p>
        </div>
      )}
    </Dialog>
  );
}
