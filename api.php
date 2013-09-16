<?php
define('END','http://api.irishrail.ie/realtime/realtime.asmx/');


$iet = new iet();

$q = (isset($_GET['q'])) ? $_GET['q'] : "";

switch ($q): 
	case 'stations':
		$t = (isset($_GET['t'])) ? $_GET['t'] : null;
		$res = $iet->getStations($t);
		break;
	case 'trains':
		$t = (isset($_GET['t'])) ? $_GET['t'] : null;
		$res = $iet->getCurrentTrains($t);
		break;
	case 'station_by_name':
		$n = (isset($_GET['n'])) ? $_GET['n'] : null;
		$m = (isset($_GET['m'])) ? $_GET['m'] : null;
		$res = $iet->getStationDataByName($n,$m);
		break;
	case 'station_by_code':
		$n = (isset($_GET['c'])) ? $_GET['c'] : null;
		$m = (isset($_GET['m'])) ? $_GET['m'] : null;
		$res = $iet->getStationDataByCode($c,$m);	
		break;
	case 'train_movements':
		$i = (isset($_GET['i'])) ? $_GET['i'] : null;
		$d = (isset($_GET['d'])) ? $_GET['d'] : null;
		$res = $iet->getTrainMovements($i,$d);
		break;
	default:
		$res = "{}";
endswitch;

header("Content-type: text/json");
echo $res;

class iet {
	public function getStations($type = "A") {
		return $this->__makeRequest("getAllStationsXML_WithStationType?StationType=" . $type);
	}

	public function getCurrentTrains($type= "A") {
		return $this->__makeRequest("getCurrentTrainsXML_WithTrainType?TrainType=" . $type);
	}

	public function getStationDataByName($name="Belfast Central",$minutes=90) {
		return $this->__makeRequest("getStationDataByNameXML?StationDesc=" . $name . "&NumMins=" . $minutes);
	}

	public function getStationDataByCode($code="BFSTC",$minutes=90) {
		return $this->__makeRequest("getStationDataByCodeXML_WithNumMins?StationCode=" . $code . "&NumMins=" . $minutes);
	}

	public function getTrainMovements($trainID="e109",$trainDate="21 dec 2011") {
		return $this->__makeRequest("getTrainMovementsXML?TrainId=". $trainID ."&TrainDate=".$trainDate);
	}

	private function __makeRequest($req) {
		$ch = curl_init(END . $req);
		curl_setopt($ch,CURLOPT_RETURNTRANSFER,true);
		$res = curl_exec($ch);
		curl_close($ch);
		if (!$res) die($req);
		return ($res) ? json_encode(xmlToArray(simplexml_load_string($res))) : false;
	}
}

function xmlToArray($xml, $options = array()) {
    $defaults = array(
        'namespaceSeparator' => ':',//you may want this to be something other than a colon
        'attributePrefix' => '@',   //to distinguish between attributes and nodes with the same name
        'alwaysArray' => array(),   //array of xml tag names which should always become arrays
        'autoArray' => true,        //only create arrays for tags which appear more than once
        'textContent' => '$',       //key used for the text content of elements
        'autoText' => true,         //skip textContent key if node has no attributes or child nodes
        'keySearch' => false,       //optional search and replace on tag and attribute names
        'keyReplace' => false       //replace values for above search values (as passed to str_replace())
    );
    $options = array_merge($defaults, $options);
    $namespaces = $xml->getDocNamespaces();
    $namespaces[''] = null; //add base (empty) namespace
 
    //get attributes from all namespaces
    $attributesArray = array();
    foreach ($namespaces as $prefix => $namespace) {
        foreach ($xml->attributes($namespace) as $attributeName => $attribute) {
            //replace characters in attribute name
            if ($options['keySearch']) $attributeName =
                    str_replace($options['keySearch'], $options['keyReplace'], $attributeName);
            $attributeKey = $options['attributePrefix']
                    . ($prefix ? $prefix . $options['namespaceSeparator'] : '')
                    . $attributeName;
            $attributesArray[$attributeKey] = (string)$attribute;
        }
    }
 
    //get child nodes from all namespaces
    $tagsArray = array();
    foreach ($namespaces as $prefix => $namespace) {
        foreach ($xml->children($namespace) as $childXml) {
            //recurse into child nodes
            $childArray = xmlToArray($childXml, $options);
            list($childTagName, $childProperties) = each($childArray);
 
            //replace characters in tag name
            if ($options['keySearch']) $childTagName =
                    str_replace($options['keySearch'], $options['keyReplace'], $childTagName);
            //add namespace prefix, if any
            if ($prefix) $childTagName = $prefix . $options['namespaceSeparator'] . $childTagName;
 
            if (!isset($tagsArray[$childTagName])) {
                //only entry with this key
                //test if tags of this type should always be arrays, no matter the element count
                $tagsArray[$childTagName] =
                        in_array($childTagName, $options['alwaysArray']) || !$options['autoArray']
                        ? array($childProperties) : $childProperties;
            } elseif (
                is_array($tagsArray[$childTagName]) && array_keys($tagsArray[$childTagName])
                === range(0, count($tagsArray[$childTagName]) - 1)
            ) {
                //key already exists and is integer indexed array
                $tagsArray[$childTagName][] = $childProperties;
            } else {
                //key exists so convert to integer indexed array with previous value in position 0
                $tagsArray[$childTagName] = array($tagsArray[$childTagName], $childProperties);
            }
        }
    }
 
    //get text content of node
    $textContentArray = array();
    $plainText = trim((string)$xml);
    if ($plainText !== '') $textContentArray[$options['textContent']] = $plainText;
 
    //stick it all together
    $propertiesArray = !$options['autoText'] || $attributesArray || $tagsArray || ($plainText === '')
            ? array_merge($attributesArray, $tagsArray, $textContentArray) : $plainText;
 
    //return node as array
    return array(
        $xml->getName() => $propertiesArray
    );
}

?>